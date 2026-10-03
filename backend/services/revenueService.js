import { supabase, shouldUseSupabase, localStore } from './supabaseClient.js';
import { isCafeProduct } from './cafeService.js';

/**
 * Categorize a product or category into the canonical business department:
 * - 'GEAR': Sports equipment, rackets, balls, apparel, accessories
 * - 'CAFE': Drinks, coffee, mocktails, food, snacks, nutrition
 */
export function getProductBusinessType(productOrCategory) {
  if (!productOrCategory) return 'GEAR';
  const category = typeof productOrCategory === 'string'
    ? productOrCategory
    : productOrCategory.category || '';
  return isCafeProduct(category) ? 'CAFE' : 'GEAR';
}

/**
 * Helper to check date range inclusion
 */
function isDateInFilter(dateStr, filter) {
  if (!dateStr || filter === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date();

  if (filter === 'today') {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  if (filter === 'week') {
    // Current week (starting Monday)
    const day = now.getDay() || 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    return d >= startOfWeek;
  }

  if (filter === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  return true;
}

/**
 * Fetch raw records needed for revenue calculation
 */
async function fetchRawRevenueRecords() {
  if (shouldUseSupabase()) {
    try {
      const [
        { data: bookingsData },
        { data: salesData },
        { data: cafeOrdersData }
      ] = await Promise.all([
        supabase.from('bookings').select('id, booking_date, price, status, created_at'),
        supabase.from('sales').select('id, created_at, total, product_id, products(id, name, category)'),
        supabase.from('cafe_orders').select('id, created_at, total, status')
      ]);

      return {
        bookings: bookingsData || [],
        sales: salesData || [],
        cafeOrders: cafeOrdersData || []
      };
    } catch (e) {
      console.warn('Supabase revenue fetch error, using local fallback:', e);
    }
  }

  // Local fallback
  return {
    bookings: [...(localStore.bookings || [])],
    sales: [...(localStore.sales || [])],
    cafeOrders: [...(localStore.cafeOrders || [])]
  };
}

/**
 * Calculate categorized revenue summary with date filtering and contribution percentages.
 * 
 * Formula (ZERO DOUBLE COUNTING):
 * 1. Court Revenue     = sum(bookings.price) where status != 'cancelled'
 * 2. Gear Shop Revenue = sum(sales.total) where product is NOT a cafe product
 * 3. Café & Bar Revenue= sum(cafe_orders.total) where status != 'CANCELLED'
 * 4. Total Revenue     = Court Revenue + Gear Shop Revenue + Café & Bar Revenue
 */
export async function getRevenueSummary(dateFilter = 'all') {
  const { bookings, sales, cafeOrders } = await fetchRawRevenueRecords();

  // 1. Court Bookings Revenue
  const validBookings = bookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    const targetDate = b.booking_date || b.created_at;
    return isDateInFilter(targetDate, dateFilter);
  });
  const courtRevenue = Number(
    validBookings.reduce((sum, b) => sum + Number(b.price || 0), 0).toFixed(2)
  );

  // 2. Gear Shop Revenue (Strictly sports gear sales; all café line items excluded)
  const gearSales = sales.filter((s) => {
    const isGear = getProductBusinessType(s.products) === 'GEAR';
    return isGear && isDateInFilter(s.created_at, dateFilter);
  });
  const gearRevenue = Number(
    gearSales.reduce((sum, s) => sum + Number(s.total || 0), 0).toFixed(2)
  );

  // 3. Café & Bar Revenue (Canonical source is cafe_orders header with net total)
  let cafeRevenue = 0;
  let validCafeOrdersCount = 0;

  const validCafeOrders = cafeOrders.filter((o) => {
    if (o.status === 'CANCELLED') return false;
    return isDateInFilter(o.created_at, dateFilter);
  });

  if (cafeOrders.length > 0) {
    validCafeOrdersCount = validCafeOrders.length;
    cafeRevenue = Number(
      validCafeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0).toFixed(2)
    );
  } else {
    // Graceful fallback to cafe sales items if cafe_orders table is not seeded
    const cafeSales = sales.filter((s) => {
      const isCafe = getProductBusinessType(s.products) === 'CAFE';
      return isCafe && isDateInFilter(s.created_at, dateFilter);
    });
    validCafeOrdersCount = cafeSales.length;
    cafeRevenue = Number(
      cafeSales.reduce((sum, s) => sum + Number(s.total || 0), 0).toFixed(2)
    );
  }

  // 4. Total Revenue (Sum of 3 distinct, non-overlapping revenue streams)
  const totalRevenue = Number((courtRevenue + gearRevenue + cafeRevenue).toFixed(2));

  // 5. Percentage contribution calculation (Guaranteed 100% sum if total > 0)
  let courtPercent = 0;
  let gearPercent = 0;
  let cafePercent = 0;

  if (totalRevenue > 0) {
    courtPercent = Math.round((courtRevenue / totalRevenue) * 100);
    gearPercent = Math.round((gearRevenue / totalRevenue) * 100);
    cafePercent = Math.max(0, 100 - (courtPercent + gearPercent));
  }

  return {
    dateFilter,
    totalRevenue,
    courtRevenue,
    gearRevenue,
    cafeRevenue,
    percentages: {
      court: courtPercent,
      gear: gearPercent,
      cafe: cafePercent
    },
    counts: {
      bookings: validBookings.length,
      gearSales: gearSales.length,
      cafeOrders: validCafeOrdersCount,
      totalTransactions: validBookings.length + gearSales.length + validCafeOrdersCount
    }
  };
}

/**
 * Get Today's Revenue Breakdown
 */
export async function getTodayRevenueBreakdown() {
  return await getRevenueSummary('today');
}

/**
 * Get Monthly Revenue Breakdown for Recharts trend visualization
 * Returns rolling months (default 6 months):
 * [ { month: 'Aug', fullName: 'August 2026', court: 1000, gear: 800, cafe: 600, total: 2400 }, ... ]
 */
export async function getMonthlyRevenueBreakdown(monthsCount = 6) {
  const { bookings, sales, cafeOrders } = await fetchRawRevenueRecords();
  const now = new Date();
  const result = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const shortLabel = d.toLocaleDateString('en-IN', { month: 'short' });
    const fullLabel = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Filter Court Bookings in this month
    const mBookings = bookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      const t = b.booking_date || b.created_at;
      return t && t.startsWith(monthKey);
    });
    const court = Number(mBookings.reduce((sum, b) => sum + Number(b.price || 0), 0).toFixed(2));

    // Filter Gear Sales in this month
    const mGearSales = sales.filter((s) => {
      const isGear = getProductBusinessType(s.products) === 'GEAR';
      return isGear && s.created_at && s.created_at.startsWith(monthKey);
    });
    const gear = Number(mGearSales.reduce((sum, s) => sum + Number(s.total || 0), 0).toFixed(2));

    // Filter Café Orders in this month
    let cafe = 0;
    if (cafeOrders.length > 0) {
      const mCafe = cafeOrders.filter((o) => {
        return o.status !== 'CANCELLED' && o.created_at && o.created_at.startsWith(monthKey);
      });
      cafe = Number(mCafe.reduce((sum, o) => sum + Number(o.total || 0), 0).toFixed(2));
    } else {
      const mCafeSales = sales.filter((s) => {
        const isCafe = getProductBusinessType(s.products) === 'CAFE';
        return isCafe && s.created_at && s.created_at.startsWith(monthKey);
      });
      cafe = Number(mCafeSales.reduce((sum, s) => sum + Number(s.total || 0), 0).toFixed(2));
    }

    const total = Number((court + gear + cafe).toFixed(2));

    result.push({
      monthKey,
      month: shortLabel,
      fullName: fullLabel,
      court,
      gear,
      cafe,
      total
    });
  }

  return result;
}

/**
 * Section-Specific Summary for Court Management (Courts.jsx)
 * Returns: Total Court Revenue, Today's Court Revenue, Bookings Today
 */
export async function getCourtRevenueStats() {
  const { bookings } = await fetchRawRevenueRecords();
  const now = new Date();

  let totalCourtRevenue = 0;
  let todayCourtRevenue = 0;
  let todayBookingsCount = 0;

  bookings.forEach((b) => {
    if (b.status === 'cancelled') return;
    const price = Number(b.price || 0);
    totalCourtRevenue += price;

    const tDate = b.booking_date || b.created_at;
    if (tDate) {
      const d = new Date(tDate);
      if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      ) {
        todayCourtRevenue += price;
        todayBookingsCount += 1;
      }
    }
  });

  return {
    totalCourtRevenue: Number(totalCourtRevenue.toFixed(2)),
    todayCourtRevenue: Number(todayCourtRevenue.toFixed(2)),
    todayBookingsCount
  };
}

/**
 * Section-Specific Summary for Gear Shop / Inventory (Inventory.jsx)
 * Returns: Total Gear Revenue, Today's Gear Revenue, Orders/Sales Count, Low Stock Count
 */
export async function getGearRevenueStats() {
  const { sales } = await fetchRawRevenueRecords();
  const now = new Date();

  let products = [];
  if (shouldUseSupabase()) {
    try {
      const { data } = await supabase.from('products').select('*');
      products = data || [];
    } catch {}
  } else {
    products = [...(localStore.products || [])];
  }

  let totalGearRevenue = 0;
  let todayGearRevenue = 0;
  let gearSalesCount = 0;

  sales.forEach((s) => {
    if (getProductBusinessType(s.products) !== 'GEAR') return;
    const total = Number(s.total || 0);
    totalGearRevenue += total;
    gearSalesCount += 1;

    if (s.created_at) {
      const d = new Date(s.created_at);
      if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      ) {
        todayGearRevenue += total;
      }
    }
  });

  const lowStockCount = products.filter((p) => {
    if (getProductBusinessType(p) !== 'GEAR') return false;
    const qty = Number(p.stock_quantity || 0);
    const threshold = Number(p.low_stock_threshold || 5);
    return qty <= threshold;
  }).length;

  return {
    totalGearRevenue: Number(totalGearRevenue.toFixed(2)),
    todayGearRevenue: Number(todayGearRevenue.toFixed(2)),
    gearSalesCount,
    lowStockCount
  };
}

/**
 * Section-Specific Summary for Café & Bar / Kitchen (Kitchen.jsx)
 * Returns: Total Café Revenue, Today's Café Revenue, Orders Today, Active Kitchen Orders
 */
export async function getCafeRevenueStats() {
  const { cafeOrders } = await fetchRawRevenueRecords();
  const now = new Date();

  let totalCafeRevenue = 0;
  let todayCafeRevenue = 0;
  let ordersToday = 0;
  let activeKitchenOrders = 0;

  cafeOrders.forEach((o) => {
    if (o.status === 'CANCELLED') return;
    const total = Number(o.total || 0);
    totalCafeRevenue += total;

    if (o.status === 'NEW' || o.status === 'PREPARING') {
      activeKitchenOrders += 1;
    }

    if (o.created_at) {
      const d = new Date(o.created_at);
      if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      ) {
        todayCafeRevenue += total;
        ordersToday += 1;
      }
    }
  });

  return {
    totalCafeRevenue: Number(totalCafeRevenue.toFixed(2)),
    todayCafeRevenue: Number(todayCafeRevenue.toFixed(2)),
    ordersToday,
    activeKitchenOrders
  };
}
