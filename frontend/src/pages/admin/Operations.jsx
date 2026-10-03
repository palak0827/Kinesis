import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { isCafeProduct } from '@backend/services/cafeService.js';
import { getCafeTables, calculateTableSummary } from '@backend/services/cafeTableService.js';
import { 
  Calendar, ChevronLeft, ChevronRight, Search, Printer, 
  TrendingUp, TrendingDown 
} from 'lucide-react';

export default function AdminOperations() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('bookings');

  // Daily records data store
  const [dayData, setDayData] = useState({
    bookings: [],
    sales: [],
    cafeOrders: [],
    members: [],
    payments: [],
    products: [],
    cafeTables: [],
    prevDayRevenue: 0
  });

  // Calculate previous day string
  const getPrevDateStr = (dateStr) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const getNextDateStr = (dateStr) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const loadDailyOperations = async (targetDate) => {
    setLoading(true);
    try {
      const startOfDay = `${targetDate}T00:00:00.000Z`;
      const endOfDay = `${targetDate}T23:59:59.999Z`;

      const prevDate = getPrevDateStr(targetDate);
      const prevStart = `${prevDate}T00:00:00.000Z`;
      const prevEnd = `${prevDate}T23:59:59.999Z`;

      // 1. Fetch Bookings for Target Date
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*, courts(*), members(*)')
        .eq('booking_date', targetDate)
        .order('start_time', { ascending: true });

      // 2. Fetch Sales for Target Date
      const { data: salesData } = await supabase
        .from('sales')
        .select('*, products(*), members(*)')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

      // 3. Fetch Café Orders for Target Date
      let cafeOrdersData = [];
      try {
        const { data: coData } = await supabase
          .from('cafe_orders')
          .select('*, members(*), cafe_order_items(*, products(*))')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .order('created_at', { ascending: false });
        cafeOrdersData = coData || [];
      } catch {
        cafeOrdersData = [];
      }

      // 4. Fetch Members registered on Target Date & Total Members
      let membersData = [];
      try {
        const { data: mData } = await supabase
          .from('members')
          .select('*, membership_plans(*)')
          .order('created_at', { ascending: false });
        membersData = mData || [];
      } catch {
        membersData = [];
      }

      // 5. Fetch Payments on Target Date
      let paymentsData = [];
      try {
        const { data: pData } = await supabase
          .from('payments')
          .select('*')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .order('created_at', { ascending: false });
        paymentsData = pData || [];
      } catch {
        // Fallback from localStorage
        try {
          const raw = JSON.parse(localStorage.getItem('kinesis_local_payments') || '[]');
          paymentsData = raw.filter(p => p.created_at && p.created_at.startsWith(targetDate));
        } catch {
          paymentsData = [];
        }
      }

      // 6. Fetch Inventory Products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .order('name');

      // 7. Fetch Café Tables
      const tables = await getCafeTables();

      // 8. Fetch Previous Day's Canonical Revenue
      const [{ data: prevBookings }, { data: prevSales }] = await Promise.all([
        supabase.from('bookings').select('price, status').eq('booking_date', prevDate).neq('status', 'cancelled'),
        supabase.from('sales').select('total, product_id, products(category)').gte('created_at', prevStart).lte('created_at', prevEnd)
      ]);

      const prevCourtRev = (prevBookings || []).reduce((sum, b) => sum + Number(b.price || 0), 0);
      const prevGearRev = (prevSales || []).filter(s => !isCafeProduct(s.products?.category)).reduce((sum, s) => sum + Number(s.total || 0), 0);
      
      let prevCafeRev = 0;
      try {
        const { data: prevCafe } = await supabase
          .from('cafe_orders')
          .select('total, status')
          .gte('created_at', prevStart)
          .lte('created_at', prevEnd)
          .neq('status', 'CANCELLED');
        prevCafeRev = (prevCafe || []).reduce((sum, o) => sum + Number(o.total || 0), 0);
      } catch {
        prevCafeRev = (prevSales || []).filter(s => isCafeProduct(s.products?.category)).reduce((sum, s) => sum + Number(s.total || 0), 0);
      }

      let prevMembershipRev = 0;
      try {
        const { data: prevPay } = await supabase
          .from('payments')
          .select('amount, reference_type, payment_status')
          .gte('created_at', prevStart)
          .lte('created_at', prevEnd)
          .eq('reference_type', 'MEMBERSHIP')
          .eq('payment_status', 'PAID');
        prevMembershipRev = (prevPay || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      } catch {}

      const prevTotalRevenue = prevCourtRev + prevGearRev + prevCafeRev + prevMembershipRev;

      setDayData({
        bookings: bookingsData || [],
        sales: salesData || [],
        cafeOrders: cafeOrdersData || [],
        members: membersData || [],
        payments: paymentsData || [],
        products: productsData || [],
        cafeTables: tables || [],
        prevDayRevenue: prevTotalRevenue
      });

    } catch (err) {
      console.error('Error loading daily operations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyOperations(selectedDate);
  }, [selectedDate]);

  // CANONICAL REVENUE CALCULATIONS FOR SELECTED DATE (ZERO DOUBLE COUNTING)
  const metrics = useMemo(() => {
    // 1. Court Revenue
    const validBookings = dayData.bookings.filter(b => b.status !== 'cancelled');
    const courtRevenue = validBookings.reduce((sum, b) => sum + Number(b.price || 0), 0);
    const completedBookings = dayData.bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = dayData.bookings.filter(b => b.status === 'cancelled').length;

    // 2. Gear Shop Revenue (from sales records where category is NOT cafe product)
    const gearSales = dayData.sales.filter(s => !isCafeProduct(s.products?.category));
    const gearRevenue = gearSales.reduce((sum, s) => sum + Number(s.total || 0), 0);

    // 3. Café & Bar Revenue (from cafe_orders where status is not CANCELLED)
    let cafeRevenue = 0;
    let completedCafeOrders = 0;
    let pendingKitchenOrders = 0;

    if (dayData.cafeOrders.length > 0) {
      dayData.cafeOrders.forEach(o => {
        if (o.status !== 'CANCELLED') {
          cafeRevenue += Number(o.total || 0);
        }
        if (o.status === 'COMPLETED') completedCafeOrders++;
        if (o.status === 'NEW' || o.status === 'PREPARING') pendingKitchenOrders++;
      });
    } else {
      // Fallback if cafe_orders is empty, use cafe sales items
      const cafeSales = dayData.sales.filter(s => isCafeProduct(s.products?.category));
      cafeRevenue = cafeSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    }

    // 4. Membership Revenue (from payments where reference_type === 'MEMBERSHIP' and status === 'PAID')
    const membershipPayments = dayData.payments.filter(p => 
      p.reference_type === 'MEMBERSHIP' && (p.payment_status === 'PAID' || p.payment_status === 'COMPLETED')
    );
    const membershipRevenue = membershipPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // TOTAL REVENUE = sum of 4 non-overlapping canonical sources
    const totalRevenue = courtRevenue + gearRevenue + cafeRevenue + membershipRevenue;

    // Day-over-Day Revenue Difference
    const revenueDifference = totalRevenue - dayData.prevDayRevenue;

    // Registrations on selected date
    const newMembers = dayData.members.filter(m => {
      const createdDate = (m.created_at || m.start_date || '').split('T')[0];
      return createdDate === selectedDate && m.user_type !== 'WALK_IN' && m.plan_id;
    }).length;

    const newWalkIns = dayData.members.filter(m => {
      const createdDate = (m.created_at || m.start_date || '').split('T')[0];
      return createdDate === selectedDate && (m.user_type === 'WALK_IN' || (!m.plan_id && !m.membership_plans));
    }).length;

    const activeMembersCount = dayData.members.filter(m => m.status === 'active' && m.user_type !== 'WALK_IN').length;

    // Low stock products count
    const lowStockCount = dayData.products.filter(p => Number(p.stock_quantity) <= Number(p.low_stock_threshold || 5)).length;

    // Café Tables Summary
    const tableSummary = calculateTableSummary(dayData.cafeTables);

    return {
      totalRevenue,
      courtRevenue,
      gearRevenue,
      cafeRevenue,
      membershipRevenue,
      totalBookings: dayData.bookings.length,
      completedBookings,
      cancelledBookings,
      gearSalesCount: gearSales.length,
      cafeOrdersCount: dayData.cafeOrders.length,
      completedCafeOrders,
      pendingKitchenOrders,
      newMembers,
      newWalkIns,
      activeMembersCount,
      lowStockCount,
      tableSummary,
      revenueDifference
    };
  }, [dayData, selectedDate]);

  // Tab Filtering & Local Search
  const q = searchQuery.toLowerCase().trim();

  const filteredBookings = useMemo(() => {
    return dayData.bookings.filter(b => {
      if (!q) return true;
      return (
        String(b.id).includes(q) ||
        b.members?.name?.toLowerCase().includes(q) ||
        b.courts?.name?.toLowerCase().includes(q) ||
        b.courts?.sport?.toLowerCase().includes(q)
      );
    });
  }, [dayData.bookings, q]);

  const filteredGearSales = useMemo(() => {
    return dayData.sales.filter(s => {
      if (isCafeProduct(s.products?.category)) return false;
      if (!q) return true;
      return (
        String(s.id).includes(q) ||
        s.products?.name?.toLowerCase().includes(q) ||
        s.members?.name?.toLowerCase().includes(q)
      );
    });
  }, [dayData.sales, q]);

  const filteredCafeOrders = useMemo(() => {
    return dayData.cafeOrders.filter(o => {
      if (!q) return true;
      return (
        String(o.id).includes(q) ||
        o.members?.name?.toLowerCase().includes(q) ||
        o.status?.toLowerCase().includes(q)
      );
    });
  }, [dayData.cafeOrders, q]);

  const filteredPayments = useMemo(() => {
    return dayData.payments.filter(p => {
      if (!q) return true;
      return (
        String(p.id).includes(q) ||
        String(p.reference_id).includes(q) ||
        p.reference_type?.toLowerCase().includes(q) ||
        p.payment_method?.toLowerCase().includes(q)
      );
    });
  }, [dayData.payments, q]);

  const handlePrintDailyReport = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '1200px' }} className="daily-ops-container">
      
      {/* UPDATE 7: TOP HEADER & DATE NAVIGATION */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={28} color="var(--primary)" />
            Daily Operations Record
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)' }}>
            Real-time day-by-day operational audit, financial breakdown, and activity logs
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Previous Day Button */}
          <button
            onClick={() => setSelectedDate(getPrevDateStr(selectedDate))}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.5rem 0.85rem', fontSize: '0.88rem' }}
            title="Previous Day"
          >
            <ChevronLeft size={16} /> Prev Day
          </button>

          {/* Date Picker Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <Calendar size={16} color="var(--primary)" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Next Day Button */}
          <button
            onClick={() => setSelectedDate(getNextDateStr(selectedDate))}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.5rem 0.85rem', fontSize: '0.88rem' }}
            title="Next Day"
          >
            Next Day <ChevronRight size={16} />
          </button>

          {/* UPDATE 22: PRINT DAILY REPORT BUTTON */}
          <button
            onClick={handlePrintDailyReport}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1rem', fontSize: '0.88rem' }}
          >
            <Printer size={16} /> Print Daily Report
          </button>
        </div>
      </div>

      {/* UPDATE 20: DAILY REVENUE DAY-OVER-DAY COMPARISON BANNER */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Daily Revenue for {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
            ₹{metrics.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Previous Day Revenue</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              ₹{dayData.prevDayRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: metrics.revenueDifference >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: metrics.revenueDifference >= 0 ? '#10b981' : '#ef4444',
            fontWeight: 700,
            fontSize: '1rem'
          }}>
            {metrics.revenueDifference >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            <span>
              {metrics.revenueDifference >= 0 ? '+' : ''}₹{Math.abs(metrics.revenueDifference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* UPDATE 8: DAILY KPI SUMMARY GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Court Revenue */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Court Bookings</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>₹{metrics.courtRevenue.toFixed(2)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {metrics.totalBookings} total ({metrics.completedBookings} comp, {metrics.cancelledBookings} canc)
          </div>
        </div>

        {/* Gear Shop Revenue */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Gear Shop Sales</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>₹{metrics.gearRevenue.toFixed(2)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{metrics.gearSalesCount} items sold</div>
        </div>

        {/* Café & Bar Revenue */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Café & Bar</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>₹{metrics.cafeRevenue.toFixed(2)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {metrics.cafeOrdersCount} orders ({metrics.pendingKitchenOrders} in kitchen)
          </div>
        </div>

        {/* Membership Revenue */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Membership Revenue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>₹{metrics.membershipRevenue.toFixed(2)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            +{metrics.newMembers} members, +{metrics.newWalkIns} walk-ins
          </div>
        </div>

        {/* Inventory & Tables */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Floor & Inventory</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--text-main)' }}>
            {metrics.tableSummary.available} / {metrics.tableSummary.total} Tables Open
          </div>
          <div style={{ fontSize: '0.78rem', color: metrics.lowStockCount > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: metrics.lowStockCount > 0 ? 600 : 400 }}>
            {metrics.lowStockCount > 0 ? `⚠️ ${metrics.lowStockCount} items low in stock` : 'Inventory healthy'}
          </div>
        </div>
      </div>

      {/* UPDATE 21: SEARCH BAR & TABS */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        
        {/* Search bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search daily records (Customer, Member ID, Booking ID, Order ID)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: '36px', fontSize: '0.88rem' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* UPDATE 9: TABS */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-main)', padding: '4px', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap' }}>
            {[
              { key: 'bookings', label: `Bookings (${filteredBookings.length})` },
              { key: 'gear', label: `Gear Shop (${filteredGearSales.length})` },
              { key: 'cafe', label: `Café & Bar (${filteredCafeOrders.length})` },
              { key: 'payments', label: `Payments (${filteredPayments.length})` },
              { key: 'inventory', label: 'Inventory Alerts' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="btn"
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB CONTENTS */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading operations log...</div>
        ) : (
          <>
            {/* 1. BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Booking ID</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Customer</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Type</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Sport & Court</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Time Slot</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Amount</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No court bookings recorded on this date.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>#KSC-BKG-{b.id}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>{b.members?.name || 'Walk-In Customer'}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-main)' }}>
                              {b.members?.user_type || 'MEMBER'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <strong>{b.courts?.sport}</strong> • {b.courts?.name}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            {b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--primary)' }}>
                            ₹{Number(b.price || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: b.status === 'confirmed' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              color: b.status === 'confirmed' ? '#10b981' : '#ef4444'
                            }}>
                              {b.status?.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. GEAR SHOP TAB */}
            {activeTab === 'gear' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Sale ID</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Product</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Customer</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Qty</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Unit Price</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Total</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGearSales.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No gear shop sales on this date.
                        </td>
                      </tr>
                    ) : (
                      filteredGearSales.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>#SALE-{s.id}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <strong>{s.products?.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.products?.category}</div>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>{s.members?.name || 'Walk-In Customer'}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>{s.quantity}x</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>₹{Number(s.unit_price).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#10b981' }}>₹{Number(s.total).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                            {s.created_at ? new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. CAFÉ & BAR TAB */}
            {activeTab === 'cafe' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Order #</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Customer</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Items</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Total</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Kitchen Status</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCafeOrders.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No café orders recorded on this date.
                        </td>
                      </tr>
                    ) : (
                      filteredCafeOrders.map(o => (
                        <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>#CAFE-{o.id}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>{o.members?.name || 'Walk-In Guest'}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            {o.cafe_order_items?.map(it => `${it.quantity}x ${it.products?.name || 'Item'}`).join(', ') || 'Menu items'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--primary)' }}>
                            ₹{Number(o.total).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              background: o.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : o.status === 'READY' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                              color: o.status === 'COMPLETED' ? '#10b981' : o.status === 'READY' ? '#3b82f6' : '#f59e0b'
                            }}>
                              {o.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                            {o.created_at ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. PAYMENTS TAB */}
            {activeTab === 'payments' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Payment ID</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Reference Type</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Ref ID</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Method</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Amount</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No payment transactions recorded for this date.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>#PAY-{p.id}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-main)', fontWeight: 600 }}>
                              {p.reference_type}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>#{p.reference_id}</td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{p.payment_method}</td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                            ₹{Number(p.amount).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              background: p.payment_status === 'PAID' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                              color: p.payment_status === 'PAID' ? '#10b981' : '#f59e0b'
                            }}>
                              {p.payment_status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                            {p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. INVENTORY ALERTS TAB */}
            {activeTab === 'inventory' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Product</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Current Stock</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Reorder Threshold</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayData.products.filter(p => Number(p.stock_quantity) <= Number(p.low_stock_threshold || 5)).length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>
                          ✓ All inventory stocks are healthy. No items below threshold.
                        </td>
                      </tr>
                    ) : (
                      dayData.products.filter(p => Number(p.stock_quantity) <= Number(p.low_stock_threshold || 5)).map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{p.category}</td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: p.stock_quantity === 0 ? '#ef4444' : '#f59e0b' }}>
                            {p.stock_quantity} units left
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>{p.low_stock_threshold || 5} units</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              background: p.stock_quantity === 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                              color: p.stock_quantity === 0 ? '#ef4444' : '#f59e0b'
                            }}>
                              {p.stock_quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      </div>

      {/* UPDATE 22: HIDDEN PRINT REPORT LAYOUT (ACTIVATED ON WINDOW.PRINT) */}
      <div className="print-report-container" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '20pt', letterSpacing: '0.08em', color: '#064e3b' }}>KINESIS SPORTS CLUB</h1>
          <h2 style={{ margin: '4px 0', fontSize: '13pt', color: '#333' }}>DAILY OPERATIONS REPORT</h2>
          <div style={{ fontSize: '10pt', color: '#666' }}>
            Report Date: {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div style={{ borderTop: '2px solid #064e3b', borderBottom: '2px solid #064e3b', padding: '12px 0', margin: '15px 0' }}>
          <table style={{ width: '100%', fontSize: '10pt' }}>
            <tbody>
              <tr>
                <td><strong>Total Revenue:</strong> ₹{metrics.totalRevenue.toFixed(2)}</td>
                <td><strong>Court Bookings:</strong> {metrics.totalBookings} (₹{metrics.courtRevenue.toFixed(2)})</td>
              </tr>
              <tr>
                <td><strong>Gear Shop Sales:</strong> {metrics.gearSalesCount} (₹{metrics.gearRevenue.toFixed(2)})</td>
                <td><strong>Café & Bar Orders:</strong> {metrics.cafeOrdersCount} (₹{metrics.cafeRevenue.toFixed(2)})</td>
              </tr>
              <tr>
                <td><strong>Membership Revenue:</strong> ₹{metrics.membershipRevenue.toFixed(2)}</td>
                <td><strong>Low Stock Alerts:</strong> {metrics.lowStockCount} items</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: '8pt', color: '#888', marginTop: '30px', textAlign: 'center' }}>
          Generated At: {new Date().toLocaleString('en-IN')} • Kinesis Club Management System
        </div>
      </div>

    </div>
  );
}
