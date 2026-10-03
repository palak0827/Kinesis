import { supabase, shouldUseSupabase, localStore } from './supabaseClient.js';
import { getMemberById } from './memberService.js';

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
  const newProduct = {
    name: productData.name.trim(),
    category: productData.category.trim() || 'General',
    price: Number(productData.price) || 0,
    stock_quantity: Math.max(0, parseInt(productData.stock_quantity, 10) || 0),
    low_stock_threshold: Math.max(1, parseInt(productData.low_stock_threshold, 10) || 5),
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
  if (updates.price !== undefined) updates.price = Number(updates.price);
  if (updates.stock_quantity !== undefined) {
    updates.stock_quantity = Math.max(0, parseInt(updates.stock_quantity, 10));
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

  return localStore.products[index];
}

/**
 * Record a sale:
 * - Checks that stock is sufficient (stock cannot become negative)
 * - Automatically decreases product stock
 * - Applies membership shop discount if member is active
 * - Records sale in sales table
 */
export async function recordSale({ productId, memberId = null, quantity = 1 }) {
  const pId = Number(productId);
  const mId = memberId ? Number(memberId) : null;
  const qty = parseInt(quantity, 10) || 1;

  if (qty <= 0) {
    throw new Error('Sale quantity must be at least 1');
  }

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
    if (memberDetails && memberDetails.status === 'active' && memberDetails.membership_plans) {
      discountPercent = Number(memberDetails.membership_plans.shop_discount) || 0;
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
    created_at: new Date().toISOString()
  };

  if (shouldUseSupabase()) {
    try {
      // Update stock
      await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', pId);

      // Insert sale
      const { data, error } = await supabase
        .from('sales')
        .insert([saleRecord])
        .select(`
          *,
          products (id, name, category, price),
          members (id, name, email)
        `)
        .single();
      if (!error && data) return data;
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase recordSale error, fallback to local:', err);
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

  return createdSale;
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
          members (id, name, email, plan_id)
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
