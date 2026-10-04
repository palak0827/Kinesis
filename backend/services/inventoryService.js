import { supabase, shouldUseSupabase, localStore } from './supabaseClient.js';
import { getMemberById } from './memberService.js';
import { createNotification } from './notificationService.js';

/**
 * Fetch products with optional category and search filtering
 */
export async function getProducts(category = 'all', search = '') {
  let list = [];

  if (shouldUseSupabase()) {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (search && search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getProducts error, fallback to local:', err);
    }
  }

  // Local fallback
  list = [...localStore.products];

  if (category && category !== 'all') {
    list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }

  return list;
}

/**
 * Business Rule: Identify products where stock_quantity <= low_stock_threshold
 */
export async function getLowStockProducts() {
  const products = await getProducts();
  return products.filter((p) => Number(p.stock_quantity) <= Number(p.low_stock_threshold));
}

/**
 * Add a new product to inventory
 */
export async function createProduct(productData) {
  if (!productData.name || !productData.name.trim()) {
    throw new Error('Product name is required.');
  }
  const priceNum = Number(productData.price);
  if (isNaN(priceNum) || priceNum <= 0) {
    throw new Error('Product price must be a positive number greater than zero.');
  }
  const stockNum = Number(productData.stock_quantity);
  if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
    throw new Error('Stock quantity must be a non-negative integer (0 or greater).');
  }
  const thresholdNum = Number(productData.low_stock_threshold);

  const newProduct = {
    name: productData.name.trim(),
    category: (productData.category || 'General').trim(),
    price: priceNum,
    stock_quantity: stockNum,
    low_stock_threshold: Math.max(1, isNaN(thresholdNum) ? 5 : parseInt(thresholdNum, 10)),
    created_at: new Date().toISOString()
  };

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();
      if (!error && data) return data;
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase createProduct error, fallback to local:', err);
    }
  }

  const maxId = localStore.products.reduce((max, p) => Math.max(max, p.id), 0);
  const created = { id: maxId + 1, ...newProduct };
  localStore.products.push(created);
  localStore.saveProducts();

  return created;
}

/**
 * Update product stock, price, or details
 */
export async function updateProduct(id, productData) {
  const pId = Number(id);

  const updates = { ...productData };
  if (updates.price !== undefined) {
    const priceNum = Number(updates.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      throw new Error('Product price must be a positive number greater than zero.');
    }
    updates.price = priceNum;
  }
  if (updates.stock_quantity !== undefined) {
    const stockNum = Number(updates.stock_quantity);
    if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      throw new Error('Stock quantity must be a non-negative integer (0 or greater).');
    }
    updates.stock_quantity = stockNum;
  }
  if (updates.low_stock_threshold !== undefined) {
    updates.low_stock_threshold = Math.max(1, parseInt(updates.low_stock_threshold, 10));
  }

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', pId)
        .select()
        .single();
      if (!error && data) return data;
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase updateProduct error, fallback to local:', err);
    }
  }

  const index = localStore.products.findIndex((p) => p.id === pId);
  if (index === -1) throw new Error('Product not found');

  localStore.products[index] = {
    ...localStore.products[index],
    ...updates
  };
  localStore.saveProducts();

  if (updates.stock_quantity !== undefined) {
    dispatchStockNotifications(localStore.products[index], Number(updates.stock_quantity));
  }

  return localStore.products[index];
}

/**
 * Record a sale:
 * - Checks that stock is sufficient (stock cannot become negative)
 * - Automatically decreases product stock
 * - Applies membership shop discount if member is active
 * - Records sale in sales table
 */
export async function recordSale({ productId, memberId = null, quantity = 1, paymentMethod = 'CARD' }) {
  const pId = Number(productId);
  const mId = memberId ? Number(memberId) : null;
  const numQty = Number(quantity);

  if (isNaN(numQty) || numQty <= 0 || !Number.isInteger(numQty)) {
    throw new Error('Sale quantity must be a positive whole integer greater than zero.');
  }
  const qty = numQty;

  // Get product
  const products = await getProducts();
  const product = products.find((p) => p.id === pId);
  if (!product) throw new Error('Product not found');

  // Business Rule 2: Stock cannot become negative
  if (Number(product.stock_quantity) < qty) {
    throw new Error(
      `Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, Requested: ${qty}`
    );
  }

  // Membership discount calculation
  let discountPercent = 0;
  let memberDetails = null;

  if (mId) {
    memberDetails = await getMemberById(mId);
    let isExpired = false;
    if (memberDetails && memberDetails.expiry_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const exp = new Date(memberDetails.expiry_date);
      exp.setHours(23, 59, 59, 999);
      if (today > exp) isExpired = true;
    }
    const isWalkIn = memberDetails?.user_type === 'WALK_IN';
    if (memberDetails && !isExpired && !isWalkIn && memberDetails.status === 'active' && memberDetails.membership_plans) {
      const isBarItem = product.category === 'Drinks & Nutrition' || product.category === 'Café' || product.category === 'Bar';
      discountPercent = isBarItem
        ? (Number(memberDetails.membership_plans.bar_discount) || 0)
        : (Number(memberDetails.membership_plans.shop_discount) || 0);
    }
  }

  const basePrice = Number(product.price);
  const unitDiscount = Number(((basePrice * discountPercent) / 100).toFixed(2));
  const effectiveUnitPrice = Number(Math.max(0, basePrice - unitDiscount).toFixed(2));
  const total = Number((effectiveUnitPrice * qty).toFixed(2));

  // Business Rule 1: Every sale decreases stock
  const newStock = Number(product.stock_quantity) - qty;

  const saleRecord = {
    product_id: pId,
    member_id: mId,
    quantity: qty,
    unit_price: effectiveUnitPrice,
    total,
    payment_method: paymentMethod || 'CARD',
    pickup_status: 'PENDING_PICKUP',
    created_at: new Date().toISOString()
  };

  if (shouldUseSupabase()) {
    try {
      // Insert sale (Postgres trigger trg_sale_stock_reduction automatically deducts stock)
      let { data, error } = await supabase
        .from('sales')
        .insert([saleRecord])
        .select(`
          *,
          products (id, name, category, price),
          members (id, name, email)
        `)
        .single();

      if (error && (error.code === 'PGRST204' || error.code === '42703' || String(error.message).includes('payment_method') || String(error.message).includes('club_id'))) {
        const { payment_method: _pm, pickup_status: _ps, ...cleanSale } = saleRecord;
        const retry = await supabase
          .from('sales')
          .insert([cleanSale])
          .select(`
            *,
            products (id, name, category, price),
            members (id, name, email)
          `)
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', pId);
        const pIndex = localStore.products.findIndex((p) => p.id === pId);
        if (pIndex !== -1) {
          localStore.products[pIndex].stock_quantity = newStock;
        }
        const finalSale = {
          ...data,
          payment_method: paymentMethod || 'CARD',
          pickup_status: 'PENDING_PICKUP',
          products: product,
          members: memberDetails
        };
        localStore.sales.unshift(finalSale);
        dispatchSaleNotifications(data, product, qty, total, mId);
        dispatchStockNotifications(product, newStock);
        return finalSale;
      }
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase recordSale error, fallback to local:', err);
      try {
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', pId);
      } catch {}
    }
  }

  // Local fallback: update product stock
  const pIndex = localStore.products.findIndex((p) => p.id === pId);
  if (pIndex !== -1) {
    localStore.products[pIndex].stock_quantity = newStock;
    localStore.saveProducts();
  }

  // Insert into local sales
  const maxSaleId = localStore.sales.reduce((max, s) => Math.max(max, s.id), 0);
  const createdSale = {
    id: maxSaleId + 1,
    ...saleRecord,
    products: product,
    members: memberDetails
  };

  localStore.sales.unshift(createdSale);
  localStore.saveSales();

  // Dispatch sale and stock notifications
  dispatchSaleNotifications(createdSale, product, qty, total, mId);
  dispatchStockNotifications(product, newStock);

  return createdSale;
}

/**
 * Update pickup status for an equipment / gear sale with duplicate prevention
 */
export async function updateSalePickupStatus(saleId, pickupStatus = 'PICKED_UP') {
  const numId = Number(saleId);
  if (!numId) {
    throw new Error('Valid Sale ID is required for pickup.');
  }

  // Check existing sale in local store / DB
  const existingSale = localStore.sales.find((s) => s.id === numId);
  if (existingSale) {
    if (existingSale.pickup_status === 'PICKED_UP') {
      throw new Error(`Sale #${numId} has already been picked up.`);
    }
    if (existingSale.status === 'CANCELLED') {
      throw new Error('Cannot pick up a cancelled sale.');
    }
  }

  if (shouldUseSupabase()) {
    try {
      const { data: dbSale, error: fetchErr } = await supabase
        .from('sales')
        .select('*')
        .eq('id', numId)
        .maybeSingle();

      if (dbSale) {
        if (dbSale.pickup_status === 'PICKED_UP') {
          throw new Error(`Sale #${numId} has already been picked up.`);
        }
        if (dbSale.status === 'CANCELLED') {
          throw new Error('Cannot pick up a cancelled sale.');
        }
      }

      const { data, error } = await supabase
        .from('sales')
        .update({
          pickup_status: pickupStatus,
          pickup_time: new Date().toISOString()
        })
        .eq('id', numId)
        .select(`
          *,
          products (id, name, category, price),
          members (id, name, email)
        `)
        .single();

      if (!error && data) {
        const localIdx = localStore.sales.findIndex(s => s.id === numId);
        if (localIdx !== -1) {
          localStore.sales[localIdx].pickup_status = pickupStatus;
          localStore.sales[localIdx].pickup_time = data.pickup_time;
          localStore.saveSales();
        }
        return data;
      }
    } catch (err) {
      if (err.message && err.message.includes('already been picked up')) throw err;
      console.warn('Supabase updateSalePickupStatus fallback:', err);
    }
  }

  if (!existingSale) {
    throw new Error(`Sale #${numId} not found.`);
  }

  existingSale.pickup_status = pickupStatus;
  existingSale.pickup_time = new Date().toISOString();
  localStore.saveSales();
  return existingSale;
}

/**
 * Fetch sales history with product and member info
 */
export async function getSalesHistory(limit = 50) {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          products (id, name, category, price),
          members (id, club_id, name, email, plan_id)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getSalesHistory error, fallback to local:', err);
    }
  }

  // Local fallback
  return localStore.sales
    .map((s) => {
      const product = localStore.products.find((p) => p.id === Number(s.product_id)) || null;
      const member = s.member_id
        ? localStore.members.find((m) => m.id === Number(s.member_id))
        : null;
      return {
        ...s,
        products: product,
        members: member
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

/**
 * Dispatch inventory stock alerts
 */
async function dispatchStockNotifications(product, newStock) {
  try {
    const isOutOfStock = newStock <= 0;
    const isLowStock = newStock <= Number(product.low_stock_threshold);
    const category = (product.category || '').toLowerCase();
    const isFoodOrBeverage = category.includes('café') || category.includes('bar') || category.includes('drink') || category.includes('food');
    const targetRole = isFoodOrBeverage ? 'RESTAURANT_MANAGER' : 'SHOP_MANAGER';

    if (isOutOfStock) {
      await createNotification({
        recipientType: 'ROLE',
        role: targetRole,
        title: 'Out of Stock Alert',
        message: `Item "${product.name}" is now OUT OF STOCK (0 remaining). Restock needed.`,
        type: 'INVENTORY',
        referenceId: product.id,
        referenceType: 'PRODUCT'
      });

      await createNotification({
        recipientType: 'ROLE',
        role: 'ADMIN',
        title: 'Out of Stock Alert',
        message: `Item "${product.name}" is now OUT OF STOCK.`,
        type: 'INVENTORY',
        referenceId: product.id,
        referenceType: 'PRODUCT'
      });
    } else if (isLowStock) {
      await createNotification({
        recipientType: 'ROLE',
        role: targetRole,
        title: 'Low Stock Warning',
        message: `Item "${product.name}" has only ${newStock} units left (threshold: ${product.low_stock_threshold}).`,
        type: 'INVENTORY',
        referenceId: product.id,
        referenceType: 'PRODUCT'
      });

      await createNotification({
        recipientType: 'ROLE',
        role: 'ADMIN',
        title: 'Low Stock Warning',
        message: `Item "${product.name}" is low on stock (${newStock} remaining).`,
        type: 'INVENTORY',
        referenceId: product.id,
        referenceType: 'PRODUCT'
      });
    }
  } catch (e) {
    console.warn('Non-blocking inventory notification error:', e);
  }
}

/**
 * Dispatch sales notifications
 */
async function dispatchSaleNotifications(sale, product, qty, total, memberId) {
  try {
    if (memberId) {
      await createNotification({
        recipientType: 'MEMBER',
        recipientId: memberId,
        role: 'MEMBER',
        title: 'Gear Shop Order Confirmed',
        message: `Purchased ${qty}x ${product.name} for ₹${total}. Payment successful.`,
        type: 'ORDER',
        referenceId: product.id,
        referenceType: 'PRODUCT_SALE'
      });
    }

    await createNotification({
      recipientType: 'ROLE',
      role: 'SHOP_MANAGER',
      title: 'New Gear Shop Sale',
      message: `Sold ${qty}x ${product.name} (Total: ₹${total}).`,
      type: 'ORDER',
      referenceId: product.id,
      referenceType: 'PRODUCT_SALE'
    });
  } catch (e) {
    console.warn('Non-blocking sale notification error:', e);
  }
}

