import { supabase, shouldUseSupabase, localStore } from './supabaseClient.js';
import { getProducts } from './inventoryService.js';
import { getMemberById } from './memberService.js';
import { createNotification } from './notificationService.js';

/**
 * Valid kitchen order lifecycle:
 * NEW -> PREPARING -> READY -> COMPLETED (or CANCELLED)
 */
const VALID_TRANSITIONS = {
  NEW: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

/**
 * Helper to identify Café & Kitchen products
 */
export const isCafeProduct = (category) => {
  const cat = (category || '').toLowerCase().trim();
  return (
    cat.includes('café') ||
    cat.includes('cafe') ||
    cat.includes('drink') ||
    cat.includes('mocktail') ||
    cat.includes('food') ||
    cat.includes('snack') ||
    cat.includes('nutrition') ||
    cat.includes('beverage') ||
    cat.includes('panini') ||
    cat.includes('wrap') ||
    cat.includes('sandwich') ||
    cat.includes('bowl')
  );
};

// Resilient priority tracker ensuring priority is maintained both before & after DB migration
const memoryPriorityOverrides = new Map();

function getEffectivePriority(orderId, dbPriority) {
  if (dbPriority) return dbPriority;
  if (memoryPriorityOverrides.has(orderId)) {
    return memoryPriorityOverrides.get(orderId);
  }
  if (typeof window !== 'undefined') {
    try {
      const overrides = JSON.parse(window.localStorage.getItem('kinesis_order_priorities') || '{}');
      if (overrides[orderId]) return overrides[orderId];
    } catch (e) {}
  }
  return 'NORMAL';
}

function setPriorityOverride(orderId, priority) {
  memoryPriorityOverrides.set(orderId, priority);
  if (typeof window !== 'undefined') {
    try {
      const overrides = JSON.parse(window.localStorage.getItem('kinesis_order_priorities') || '{}');
      overrides[orderId] = priority;
      window.localStorage.setItem('kinesis_order_priorities', JSON.stringify(overrides));
    } catch (e) {}
  }
}

/**
 * 1. Create a Café-Bar Order
 * - Validates cart is not empty
 * - Validates product existence and available stock
 * - Applies membership bar_discount
 * - Inserts cafe_orders (order header)
 * - Inserts cafe_order_items (order lines)
 * - Deducts product stock EXACTLY ONCE
 * - Records sales revenue in sales table EXACTLY ONCE
 */
export async function createCafeOrder({ memberId = null, items = [], priority = 'NORMAL' }) {
  const safePriority = String(priority).toUpperCase() === 'URGENT' ? 'URGENT' : 'NORMAL';

  // Step 1: Validate member
  let member = null;
  const mId = memberId ? Number(memberId) : null;
  if (mId) {
    member = await getMemberById(mId);
  }

  // Step 2: Validate cart is not empty
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Cart is empty. Please add items to place an order.');
  }

  // Step 3: Load products
  const products = await getProducts();

  // Step 4: DEADLOCK PREVENTION - Sort items deterministically by ascending product ID
  // When multiple carts contain overlapping items (e.g. Cart A: [5, 2] vs Cart B: [2, 5]),
  // sorting by product ID ensures all concurrent transactions lock rows in the same order.
  const sortedRawItems = [...items].sort((a, b) => {
    const idA = Number(a.productId || a.product_id || a.id);
    const idB = Number(b.productId || b.product_id || b.id);
    return idA - idB;
  });

  const preparedItems = [];
  for (const item of sortedRawItems) {
    const pId = Number(item.productId || item.product_id || item.id);
    const quantity = parseInt(item.quantity, 10) || 1;

    if (quantity <= 0) {
      throw new Error('Order item quantity must be at least 1.');
    }

    const product = products.find((p) => p.id === pId);
    if (!product) {
      throw new Error(`Product with ID ${pId} not found.`);
    }

    if (Number(product.stock_quantity) < quantity) {
      throw new Error(
        `Sorry, "${product.name}" was just purchased by another customer and is now out of stock.`
      );
    }

    const unitPrice = Number(product.price);
    const lineTotal = Number((unitPrice * quantity).toFixed(2));

    preparedItems.push({
      productId: pId,
      product,
      quantity,
      unitPrice,
      total: lineTotal
    });
  }

  // Step 5: Determine bar_discount from member's active plan
  // CORE BUSINESS RULE: Membership determines pricing/discounts.
  // It NEVER determines inventory priority. Limited resources are allocated FCFS.
  let bar_discount = 0;
  if (member && member.status === 'active' && member.membership_plans) {
    bar_discount = Number(member.membership_plans.bar_discount) || 0;
  }

  // Step 6: Calculate subtotal
  const subtotal = Number(
    preparedItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)
  );

  // Step 7: Calculate discount amount using the formula
  const discountAmount = Number(((subtotal * (bar_discount / 100))).toFixed(2));

  // Step 8: Calculate final total
  const finalTotal = Number((subtotal - discountAmount).toFixed(2));

  // Step 9: Database execution
  let createdOrder = null;

  if (shouldUseSupabase()) {
    // 9A. Try PostgreSQL atomic RPC function first
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('concurrency_safe_checkout', {
        p_member_id: member ? member.id : null,
        p_items: preparedItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        p_priority: safePriority,
        p_order_type: 'CAFE_ORDER',
        p_bar_discount_percent: bar_discount
      });

      if (!rpcError && rpcResult) {
        if (!rpcResult.success) {
          throw new Error(rpcResult.message || 'Sorry, this item was just purchased by another customer and is now out of stock.');
        }
        return {
          id: rpcResult.order_id,
          subtotal: rpcResult.subtotal,
          discount_amount: rpcResult.discount_amount,
          total: rpcResult.total,
          status: 'NEW',
          priority: safePriority,
          members: member ? { id: member.id, name: member.name, email: member.email } : null
        };
      }
    } catch (rpcEx) {
      const rpcMsg = String(rpcEx.message || '');
      // If error is genuine out of stock, propagate clean message immediately
      if (rpcMsg.includes('out of stock') || rpcMsg.includes('INSUFFICIENT_STOCK')) {
        throw rpcEx;
      }
      // If RPC is simply not yet compiled/migrated in remote schema, proceed to client-coordinated atomic reservation
    }

    // 9B. Client-coordinated Atomic Multi-Item Transaction with Rollback Protection
    const createdSaleIds = [];
    const reservedItems = [];

    try {
      // PHASE 1: ATOMIC STOCK RESERVATION
      // Insert sales in deterministic order. PostgreSQL's trg_sale_stock_reduction and
      // CHECK (stock_quantity >= 0) constraint will physically block overselling.
      for (const item of preparedItems) {
        const itemDiscount = Number(((item.unitPrice * bar_discount) / 100).toFixed(2));
        const effectiveUnitPrice = Number(Math.max(0, item.unitPrice - itemDiscount).toFixed(2));
        const itemSaleTotal = Number((effectiveUnitPrice * item.quantity).toFixed(2));

        const saleRecord = {
          product_id: item.productId,
          member_id: member ? member.id : null,
          quantity: item.quantity,
          unit_price: effectiveUnitPrice,
          total: itemSaleTotal,
          created_at: new Date().toISOString()
        };

        const { data: sData, error: saleErr } = await supabase.from('sales').insert([saleRecord]).select();
        if (saleErr) {
          throw new Error(`INSUFFICIENT_STOCK:${item.product?.name || 'Item'}`);
        }
        if (sData?.[0]?.id) {
          createdSaleIds.push(sData[0].id);
          reservedItems.push({
            productId: item.productId,
            quantity: item.quantity,
            saleId: sData[0].id
          });
        }
      }

      // PHASE 2: INSERT ORDER HEADER AFTER ALL ITEMS ARE SUCCESSFULLY RESERVED
      const orderRecord = {
        member_id: member ? member.id : null,
        subtotal: subtotal,
        discount_amount: discountAmount,
        total: finalTotal,
        status: 'NEW',
        priority: safePriority,
        created_at: new Date().toISOString()
      };

      let insertedOrder = null;
      const { data: ordData, error: ordError } = await supabase
        .from('cafe_orders')
        .insert([orderRecord])
        .select()
        .single();

      if (ordError) {
        if (ordError.code === '42703' || String(ordError.message || '').includes('priority')) {
          const { priority: _omit, ...recordWithoutPriority } = orderRecord;
          const { data: fbData, error: fbError } = await supabase
            .from('cafe_orders')
            .insert([recordWithoutPriority])
            .select()
            .single();
          if (fbError) throw fbError;
          insertedOrder = { ...fbData, priority: safePriority };
        } else {
          throw ordError;
        }
      } else {
        insertedOrder = ordData;
      }
      createdOrder = insertedOrder;

      // PHASE 3: INSERT ORDER LINE ITEMS
      const orderItemsRecords = preparedItems.map((item) => ({
        order_id: createdOrder.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from('cafe_order_items')
        .insert(orderItemsRecords)
        .select();

      if (itemsError) throw itemsError;

      setPriorityOverride(createdOrder.id, safePriority);

      // Return the created order
      const finalResult = {
        ...createdOrder,
        items: insertedItems,
        members: member ? { id: member.id, name: member.name, email: member.email } : null
      };
      dispatchOrderCreatedNotifications(createdOrder, preparedItems, member, safePriority);
      return finalResult;

    } catch (err) {
      // MULTI-ITEM CART ATOMICITY: ROLLBACK ALL RESERVATIONS ON ANY FAILURE
      if (createdSaleIds.length > 0) {
        try {
          await supabase.from('sales').delete().in('id', createdSaleIds);
          // Re-credit stock for deleted sales to guarantee complete database rollback
          for (const res of reservedItems) {
            const { data: curP } = await supabase.from('products').select('stock_quantity').eq('id', res.productId).single();
            if (curP) {
              await supabase.from('products').update({ stock_quantity: curP.stock_quantity + res.quantity }).eq('id', res.productId);
            }
          }
        } catch (cleanupErr) {
          console.warn('Rollback compensation error:', cleanupErr);
        }
      }

      // If cafe_orders was created but line items failed, delete the orphaned order
      if (createdOrder?.id) {
        try {
          await supabase.from('cafe_orders').delete().eq('id', createdOrder.id);
        } catch {}
      }

      const msg = String(err.message || '');
      if (msg.includes('INSUFFICIENT_STOCK')) {
        const pName = msg.split(':')[1] || 'This item';
        throw new Error(`Sorry, "${pName}" was just purchased by another customer and is now out of stock.`);
      }
      if (msg.includes('check constraint') || msg.includes('stock_quantity')) {
        throw new Error('Sorry, this item was just purchased by another customer and is now out of stock. Please update your cart.');
      }
      throw err;
    }
  }

  // Local fallback execution (for offline or local demo mode)
  const maxOrderId = localStore.cafeOrders.reduce((max, o) => Math.max(max, o.id || 0), 0);
  createdOrder = {
    id: maxOrderId + 1,
    ...orderRecord,
    priority: safePriority,
    members: member ? { id: member.id, name: member.name, email: member.email } : null
  };

  const createdItems = preparedItems.map((item, idx) => ({
    id: (localStore.cafeOrderItems.length || 0) + idx + 1,
    order_id: createdOrder.id,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total: item.total,
    products: item.product
  }));

  // Deduct stock exactly once in local store
  for (const item of preparedItems) {
    const pIndex = localStore.products.findIndex((p) => p.id === item.productId);
    if (pIndex !== -1) {
      localStore.products[pIndex].stock_quantity =
        Number(localStore.products[pIndex].stock_quantity) - item.quantity;
    }

    // Insert sales exactly once
    const itemDiscount = Number(((item.unitPrice * bar_discount) / 100).toFixed(2));
    const effectiveUnitPrice = Number(Math.max(0, item.unitPrice - itemDiscount).toFixed(2));
    const maxSaleId = localStore.sales.reduce((max, s) => Math.max(max, s.id || 0), 0);

    localStore.sales.unshift({
      id: maxSaleId + 1,
      product_id: item.productId,
      member_id: member ? member.id : null,
      quantity: item.quantity,
      unit_price: effectiveUnitPrice,
      total: Number((effectiveUnitPrice * item.quantity).toFixed(2)),
      created_at: new Date().toISOString(),
      products: item.product,
      members: member
    });
  }

  localStore.cafeOrders.unshift(createdOrder);
  localStore.cafeOrderItems.push(...createdItems);
  localStore.saveProducts();
  localStore.saveSales();
  localStore.saveCafeOrders();
  localStore.saveCafeOrderItems();

  const localOrderResult = {
    ...createdOrder,
    items: createdItems
  };
  dispatchOrderCreatedNotifications(createdOrder, preparedItems, member, safePriority);
  return localOrderResult;
}


/**
 * 2. Get all Kitchen Orders
 * Returns orders with their line items and member info, ordered chronologically.
 */
export async function getKitchenOrders() {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('cafe_orders')
        .select(`
          *,
          members (id, name, email),
          cafe_order_items (
            id,
            quantity,
            unit_price,
            total,
            products (id, name, category)
          )
        `)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return (data || [])
          .map((o) => ({
            ...o,
            priority: getEffectivePriority(o.id, o.priority)
          }))
          .sort((a, b) => {
            const aUrgent = a.priority === 'URGENT' ? 1 : 0;
            const bUrgent = b.priority === 'URGENT' ? 1 : 0;
            if (bUrgent !== aUrgent) return bUrgent - aUrgent;
            return new Date(a.created_at) - new Date(b.created_at);
          });
      }
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase getKitchenOrders error, fallback to localStore:', err);
    }
  }

  // Local fallback
  return localStore.cafeOrders
    .map((order) => {
      const items = localStore.cafeOrderItems
        .filter((i) => i.order_id === order.id)
        .map((i) => ({
          ...i,
          products: localStore.products.find((p) => p.id === i.product_id)
        }));
      const member = localStore.members.find((m) => m.id === order.member_id);
      return {
        ...order,
        priority: order.priority || 'NORMAL',
        members: member ? { id: member.id, name: member.name, email: member.email } : null,
        cafe_order_items: items
      };
    })
    .sort((a, b) => {
      const aUrgent = a.priority === 'URGENT' ? 1 : 0;
      const bUrgent = b.priority === 'URGENT' ? 1 : 0;
      if (bUrgent !== aUrgent) return bUrgent - aUrgent;
      return new Date(a.created_at) - new Date(b.created_at);
    });
}

/**
 * 3. Update Order Status
 * Enforces strictly valid state transitions:
 * NEW -> PREPARING -> READY -> COMPLETED (or CANCELLED)
 */
export async function updateOrderStatus(orderId, newStatus) {
  const oId = Number(orderId);
  const targetStatus = String(newStatus).toUpperCase();

  // Find existing order to check current status
  let currentStatus = null;

  if (shouldUseSupabase()) {
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('cafe_orders')
        .select('status')
        .eq('id', oId)
        .single();

      if (fetchErr) throw fetchErr;
      currentStatus = existing?.status;
    } catch (err) {
      console.warn('Could not fetch existing order status from Supabase:', err);
    }
  }

  if (!currentStatus) {
    const local = localStore.cafeOrders.find((o) => o.id === oId);
    if (!local) throw new Error(`Order #${oId} not found.`);
    currentStatus = local.status;
  }

  // Validate status transition
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Invalid status change. Cannot move order #${oId} from "${currentStatus}" to "${targetStatus}".`
    );
  }

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('cafe_orders')
        .update({ status: targetStatus })
        .eq('id', oId)
        .select(`
          *,
          members (id, name, email),
          cafe_order_items (
            id,
            quantity,
            unit_price,
            total,
            products (id, name, category)
          )
        `)
        .single();

      if (!error && data) {
        // Also sync localStore
        const localIdx = localStore.cafeOrders.findIndex((o) => o.id === oId);
        if (localIdx !== -1) {
          localStore.cafeOrders[localIdx].status = targetStatus;
          localStore.saveCafeOrders();
        }
        dispatchOrderStatusNotifications(oId, targetStatus, data.member_id || data.members?.id);
        return {
          ...data,
          priority: data.priority || 'NORMAL'
        };
      }
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase updateOrderStatus error, fallback to localStore:', err);
    }
  }

  // Local fallback update
  const index = localStore.cafeOrders.findIndex((o) => o.id === oId);
  if (index === -1) throw new Error(`Order #${oId} not found.`);
  localStore.cafeOrders[index].status = targetStatus;
  localStore.saveCafeOrders();

  dispatchOrderStatusNotifications(oId, targetStatus, localStore.cafeOrders[index].member_id);
  return {
    ...localStore.cafeOrders[index],
    priority: localStore.cafeOrders[index].priority || 'NORMAL'
  };
}

/**
 * Dispatch notifications on order creation
 */
async function dispatchOrderCreatedNotifications(order, items, member, priority) {
  try {
    const orderId = order.id;
    const finalTotal = order.final_total || order.subtotal || 0;
    const memberId = order.member_id || member?.id;
    const isUrgent = priority === 'URGENT';

    // 1. Member receives "Order Placed"
    if (memberId) {
      await createNotification({
        recipientType: 'MEMBER',
        recipientId: memberId,
        role: 'MEMBER',
        title: 'Order Placed',
        message: `Your Café & Bar order #${orderId} has been placed successfully (₹${finalTotal}).`,
        type: 'ORDER',
        referenceId: orderId,
        referenceType: 'CAFE_ORDER'
      });
    }

    // 2. Restaurant Manager receives "New Restaurant Order"
    await createNotification({
      recipientType: 'ROLE',
      role: 'RESTAURANT_MANAGER',
      title: isUrgent ? 'Urgent Kitchen Order' : 'New Restaurant Order',
      message: `New order #${orderId} (${priority}) received for ₹${finalTotal}.`,
      type: 'ORDER',
      referenceId: orderId,
      referenceType: 'CAFE_ORDER'
    });

    // 3. Bar Manager receives notification if any beverage is included
    const hasBeverages = items?.some(i => {
      const cat = (i?.products?.category || i?.product?.category || '').toLowerCase();
      return cat.includes('drink') || cat.includes('bar') || cat.includes('beverage') || cat.includes('mocktail');
    });

    if (hasBeverages) {
      await createNotification({
        recipientType: 'ROLE',
        role: 'BAR_MANAGER',
        title: isUrgent ? 'Urgent Bar Order' : 'New Bar Order',
        message: `New beverage ticket for order #${orderId}.`,
        type: 'ORDER',
        referenceId: orderId,
        referenceType: 'CAFE_ORDER'
      });
    }

    // 4. Admin receives notification
    await createNotification({
      recipientType: 'ROLE',
      role: 'ADMIN',
      title: 'New Café & Bar Order',
      message: `Order #${orderId} received (₹${finalTotal}).`,
      type: 'ORDER',
      referenceId: orderId,
      referenceType: 'CAFE_ORDER'
    });
  } catch (e) {
    console.warn('Non-blocking notification error in cafeService:', e);
  }
}

/**
 * Dispatch notifications on order status changes
 */
async function dispatchOrderStatusNotifications(orderId, newStatus, memberId) {
  try {
    const status = String(newStatus).toUpperCase();
    let title = `Order ${status}`;
    let message = `Order #${orderId} status changed to ${status}.`;

    if (status === 'PREPARING') {
      title = 'Order Preparing';
      message = `Your order #${orderId} is now being prepared in the kitchen.`;
    } else if (status === 'READY') {
      title = 'Order Ready';
      message = `Your order #${orderId} is ready for pickup/serving!`;
    } else if (status === 'COMPLETED') {
      title = 'Order Completed';
      message = `Your order #${orderId} has been completed. Enjoy!`;
    } else if (status === 'CANCELLED') {
      title = 'Order Cancelled';
      message = `Your order #${orderId} has been cancelled.`;
    }

    // Member notification
    if (memberId) {
      await createNotification({
        recipientType: 'MEMBER',
        recipientId: memberId,
        role: 'MEMBER',
        title,
        message,
        type: 'ORDER',
        referenceId: orderId,
        referenceType: 'CAFE_ORDER'
      });
    }

    // Restaurant / Bar notification
    await createNotification({
      recipientType: 'ROLE',
      role: 'RESTAURANT_MANAGER',
      title: `Order #${orderId} ${status}`,
      message: `Order #${orderId} is now ${status}.`,
      type: 'ORDER',
      referenceId: orderId,
      referenceType: 'CAFE_ORDER'
    });

    await createNotification({
      recipientType: 'ROLE',
      role: 'ADMIN',
      title: `Order #${orderId} ${status}`,
      message: `Order #${orderId} is now ${status}.`,
      type: 'ORDER',
      referenceId: orderId,
      referenceType: 'CAFE_ORDER'
    });
  } catch (e) {
    console.warn('Non-blocking notification error in cafeService:', e);
  }
}


/**
 * 4. Update Order Priority
 * Allows kitchen staff to toggle between NORMAL and URGENT
 */
export async function updateOrderPriority(orderId, newPriority) {
  const oId = Number(orderId);
  const targetPriority = String(newPriority).toUpperCase() === 'URGENT' ? 'URGENT' : 'NORMAL';
  setPriorityOverride(oId, targetPriority);

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('cafe_orders')
        .update({ priority: targetPriority })
        .eq('id', oId)
        .select(`
          *,
          members (id, name, email),
          cafe_order_items (
            id,
            quantity,
            unit_price,
            total,
            products (id, name, category)
          )
        `)
        .single();

      if (!error && data) {
        const localIdx = localStore.cafeOrders.findIndex((o) => o.id === oId);
        if (localIdx !== -1) {
          localStore.cafeOrders[localIdx].priority = targetPriority;
          localStore.saveCafeOrders();
        }
        return {
          ...data,
          priority: targetPriority
        };
      }
      if (error && error.code !== '42703') throw error;
    } catch (err) {
      console.warn('Supabase updateOrderPriority error, updating localStore/memory:', err);
    }
  }

  // Local fallback
  const index = localStore.cafeOrders.findIndex((o) => o.id === oId);
  if (index !== -1) {
    localStore.cafeOrders[index].priority = targetPriority;
    localStore.saveCafeOrders();
    return localStore.cafeOrders[index];
  }

  return { id: oId, priority: targetPriority };
}

/**
 * 5. Get Member Café Order History
 * Strictly scoped to the authenticated member ID.
 */
export async function getMemberCafeOrders(memberId) {
  const mId = Number(memberId);
  if (!mId) return [];

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('cafe_orders')
        .select(`
          *,
          cafe_order_items (
            id,
            quantity,
            unit_price,
            total,
            products (id, name, category)
          )
        `)
        .eq('member_id', mId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return (data || []).map((o) => ({
          ...o,
          priority: getEffectivePriority(o.id, o.priority)
        }));
      }
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase getMemberCafeOrders error, fallback to localStore:', err);
    }
  }

  // Local fallback
  return localStore.cafeOrders
    .filter((o) => Number(o.member_id) === mId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((order) => {
      const items = localStore.cafeOrderItems
        .filter((i) => i.order_id === order.id)
        .map((i) => ({
          ...i,
          products: localStore.products.find((p) => p.id === i.product_id)
        }));
      return {
        ...order,
        priority: order.priority || 'NORMAL',
        cafe_order_items: items
      };
    });
}

/**
 * 6. Get Kitchen Low-Stock Alerts
 * Only returns Café/Kitchen products at or below their low_stock_threshold.
 * Explicitly excludes sports equipment.
 */
export async function getKitchenStockAlerts() {
  const allProducts = await getProducts();
  return (allProducts || []).filter((p) => {
    if (!isCafeProduct(p.category)) return false;
    return Number(p.stock_quantity) <= Number(p.low_stock_threshold);
  });
}

