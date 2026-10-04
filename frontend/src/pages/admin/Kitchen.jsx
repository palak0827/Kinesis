import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import {
  getKitchenOrders,
  updateOrderStatus,
  updateOrderPriority,
  getKitchenStockAlerts
} from '@backend/services/cafeService.js';
import { getCafeRevenueStats } from '@backend/services/revenueService.js';
import CurrentDate from '../../components/CurrentDate.jsx';

const ColumnHeader = ({ title, count, color }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem 1rem',
      background: 'var(--bg-surface)',
      borderRadius: 'var(--radius-sm)',
      borderLeft: `4px solid ${color}`,
      borderTop: '1px solid var(--border-subtle)',
      borderRight: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
      marginBottom: '1rem'
    }}
  >
    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</span>
    <span
      style={{
        background: color,
        color: 'white',
        borderRadius: '12px',
        padding: '0.15rem 0.55rem',
        fontSize: '0.75rem',
        fontWeight: 700
      }}
    >
      {count}
    </span>
  </div>
);

export default function Kitchen() {
  const [activeTab, setActiveTab] = useState('kitchen'); // 'kitchen' or 'sports'
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [sportsSales, setSportsSales] = useState([]);
  const [kitchenAlerts, setKitchenAlerts] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [updatingPriorityId, setUpdatingPriorityId] = useState(null);
  const [cafeStats, setCafeStats] = useState({
    totalCafeRevenue: 0,
    todayCafeRevenue: 0,
    ordersToday: 0,
    activeKitchenOrders: 0
  });

  // Search and Filter States (Feature 5)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'NEW', 'PREPARING', 'READY', 'COMPLETED'
  const [priorityFilter, setPriorityFilter] = useState('ALL'); // 'ALL', 'NORMAL', 'URGENT'

  const fetchData = async () => {
    try {
      setError(null);

      // 1. Fetch live kitchen orders (with priority, line items, and member info)
      const kData = await getKitchenOrders();
      setKitchenOrders(kData || []);

      // 2. Fetch retail sales (joined with products and members)
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select(`
          id,
          quantity,
          unit_price,
          total,
          created_at,
          products (id, name, category, price),
          members (id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (salesErr) throw salesErr;

      // Filter only retail sports orders (non-cafe products)
      const filteredSports = (salesData || []).filter((s) => {
        const cat = (s.products?.category || '').toLowerCase();
        return (
          !cat.includes('drink') &&
          !cat.includes('café') &&
          !cat.includes('cafe') &&
          !cat.includes('food') &&
          !cat.includes('nutrition')
        );
      });
      setSportsSales(filteredSports);

      // 3. Fetch dedicated kitchen low-stock products (Feature 4)
      const alerts = await getKitchenStockAlerts();
      setKitchenAlerts(alerts || []);

      // 4. Overall low stock count for general inventory KPI
      const { count: lowCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lte('stock_quantity', 5);
      setLowStockCount(lowCount || 0);

      // 5. Fetch centralized Café & Bar revenue stats
      try {
        const cStats = await getCafeRevenueStats();
        setCafeStats(cStats);
      } catch (e) {
        console.error('Error fetching cafe revenue stats:', e);
      }

    } catch (err) {
      console.error('Error fetching admin orders data:', err);
      setError(err.message || 'Failed to load order streams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 8 seconds for real-time demo synchronization
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Status transition handler (Feature 1)
  const handleStatusChange = async (orderId, nextStatus) => {
    try {
      setUpdatingId(orderId);
      setError(null);
      await updateOrderStatus(orderId, nextStatus);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Priority toggle handler (Feature 2)
  const handlePriorityToggle = async (orderId, targetPriority) => {
    try {
      setUpdatingPriorityId(orderId);
      setError(null);
      await updateOrderPriority(orderId, targetPriority);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update order priority.');
    } finally {
      setUpdatingPriorityId(null);
    }
  };

  // Helper to determine if an ISO timestamp is today in the local browser timezone
  const isToday = (isoString) => {
    if (!isoString) return false;
    const d = new Date(isoString);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // Feature 6: Today's Kitchen Statistics
  const todayOrders = kitchenOrders.filter((o) => isToday(o.created_at));
  const todayNewCount = todayOrders.filter((o) => o.status === 'NEW').length;
  const todayPrepCount = todayOrders.filter((o) => o.status === 'PREPARING').length;
  const todayReadyCount = todayOrders.filter((o) => o.status === 'READY').length;
  const todayCompletedCount = todayOrders.filter((o) => o.status === 'COMPLETED').length;
  const todayUrgentCount = todayOrders.filter((o) => (o.priority || 'NORMAL') === 'URGENT').length;
  const todayRevenue = todayOrders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  // Format timestamp helper
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Feature 5: Combined Filter Logic
  const filteredOrders = kitchenOrders.filter((order) => {
    // 1. Search Query (Order # or Member Name)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase().replace('#', '');
      const orderIdStr = String(order.id);
      const memberName = (order.members?.name || (order.member_id ? `Member #${order.member_id}` : 'Guest')).toLowerCase();
      const matchesId = orderIdStr.includes(q);
      const matchesMember = memberName.includes(q);
      if (!matchesId && !matchesMember) return false;
    }

    // 2. Status Filter
    if (statusFilter !== 'ALL' && order.status !== statusFilter) {
      return false;
    }

    // 3. Priority Filter
    const orderPriority = (order.priority || 'NORMAL').toUpperCase();
    if (priorityFilter !== 'ALL' && orderPriority !== priorityFilter) {
      return false;
    }

    return true;
  });

  // Feature 2: Group kitchen orders by lifecycle stage with URGENT appearing first
  const sortQueue = (list) => {
    return [...list].sort((a, b) => {
      const aUrgent = (a.priority || 'NORMAL') === 'URGENT' ? 1 : 0;
      const bUrgent = (b.priority || 'NORMAL') === 'URGENT' ? 1 : 0;
      if (bUrgent !== aUrgent) return bUrgent - aUrgent; // Urgent first
      return new Date(a.created_at) - new Date(b.created_at); // FIFO for same priority
    });
  };

  const newOrders = sortQueue(filteredOrders.filter((o) => o.status === 'NEW'));
  const prepOrders = sortQueue(filteredOrders.filter((o) => o.status === 'PREPARING'));
  const readyOrders = sortQueue(filteredOrders.filter((o) => o.status === 'READY'));
  const completedOrders = sortQueue(filteredOrders.filter((o) => o.status === 'COMPLETED'));

  // Feature 1 & 2: Detailed Kitchen Order Card
  const renderKitchenCard = (order) => {
    const isUpdating = updatingId === order.id;
    const isPriorityUpdating = updatingPriorityId === order.id;
    const items = order.cafe_order_items || [];
    const memberName = order.members?.name || (order.member_id ? `Member #${order.member_id}` : 'Guest');
    const isUrgent = (order.priority || 'NORMAL') === 'URGENT';

    return (
      <div
        key={order.id}
        className="card"
        style={{
          background: isUrgent ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-surface)',
          border: isUrgent ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: isUrgent ? '0 4px 12px rgba(239, 68, 68, 0.12)' : '0 2px 4px rgba(0,0,0,0.04)',
          position: 'relative'
        }}
      >
        {/* Ticket Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: isUrgent ? '#ef4444' : 'var(--text-main)' }}>
              #{order.id}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                fontWeight: 700,
                background: isUrgent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isUrgent ? '#ef4444' : '#10b981'
              }}
            >
              {isUrgent ? '🔴 URGENT' : '🟢 NORMAL'}
            </span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            <div>{formatDate(order.created_at)}</div>
            <div style={{ fontWeight: 600 }}>{formatTime(order.created_at)}</div>
          </div>
        </div>

        {/* Customer & Status row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Customer: </span>
            <strong style={{ color: 'var(--text-main)' }}>{memberName}</strong>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              textTransform: 'uppercase',
              background:
                order.status === 'NEW' ? 'rgba(59, 130, 246, 0.12)' :
                order.status === 'PREPARING' ? 'rgba(245, 158, 11, 0.12)' :
                order.status === 'READY' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(107, 114, 128, 0.12)',
              color:
                order.status === 'NEW' ? '#3b82f6' :
                order.status === 'PREPARING' ? '#f59e0b' :
                order.status === 'READY' ? '#10b981' : '#6b7280'
            }}
          >
            {order.status}
          </span>
        </div>

        {/* Line Items List with Item, Quantity, Unit Price, and Item Total */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--bg-main)', padding: '0.65rem', borderRadius: '4px' }}>
          {items.map((item, idx) => (
            <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontWeight: 600 }}>{item.products?.name || `Product #${item.product_id}`}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.35rem', fontSize: '0.8rem' }}>
                  × {item.quantity} (@ ₹{Number(item.unit_price).toFixed(2)})
                </span>
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                ₹{Number(item.total).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Financial Breakdown: Subtotal, Discount, Final Total */}
        <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Subtotal</span>
            <span>₹{Number(order.subtotal || order.total).toFixed(2)}</span>
          </div>

          {Number(order.discount_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 500 }}>
              <span>Discount</span>
              <span>-₹{Number(order.discount_amount).toFixed(2)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
            <span>Total</span>
            <span>₹{Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Action Controls: Lifecycle Status Transition & Priority Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
          {/* Status action button */}
          {order.status === 'NEW' && (
            <button
              className="btn btn-primary"
              disabled={isUpdating}
              onClick={() => handleStatusChange(order.id, 'PREPARING')}
              style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              {isUpdating ? 'Updating...' : 'Start Preparing'}
            </button>
          )}

          {order.status === 'PREPARING' && (
            <button
              className="btn"
              disabled={isUpdating}
              onClick={() => handleStatusChange(order.id, 'READY')}
              style={{
                width: '100%',
                padding: '0.55rem',
                fontSize: '0.85rem',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                fontWeight: 600
              }}
            >
              {isUpdating ? 'Updating...' : 'Mark Ready'}
            </button>
          )}

          {order.status === 'READY' && (
            <button
              className="btn"
              disabled={isUpdating}
              onClick={() => handleStatusChange(order.id, 'COMPLETED')}
              style={{
                width: '100%',
                padding: '0.55rem',
                fontSize: '0.85rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                fontWeight: 600
              }}
            >
              {isUpdating ? 'Updating...' : 'Mark Completed'}
            </button>
          )}

          {order.status === 'COMPLETED' && (
            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#10b981', fontWeight: 600, padding: '0.35rem' }}>
              ✓ Completed
            </div>
          )}

          {/* Priority Toggle Action (Feature 2) */}
          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <button
              type="button"
              className="btn"
              disabled={isPriorityUpdating}
              onClick={() => handlePriorityToggle(order.id, isUrgent ? 'NORMAL' : 'URGENT')}
              style={{
                width: '100%',
                padding: '0.4rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: isUrgent ? 'transparent' : 'rgba(239, 68, 68, 0.08)',
                color: isUrgent ? 'var(--text-muted)' : '#ef4444',
                border: isUrgent ? '1px solid var(--border-subtle)' : '1px solid rgba(239, 68, 68, 0.3)',
                cursor: 'pointer'
              }}
            >
              {isPriorityUpdating ? 'Saving...' : isUrgent ? '🟢 Mark Normal' : '🔴 Mark Urgent'}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading && kitchenOrders.length === 0 && sportsSales.length === 0) {
    return <div style={{ padding: '2rem' }}>Loading club order streams...</div>;
  }

  // Active kitchen queue count
  const pendingKitchenCount = kitchenOrders.filter(o => o.status === 'NEW' || o.status === 'PREPARING').length;
  const readyKitchenCount = kitchenOrders.filter(o => o.status === 'READY').length;
  const totalSportsRevenue = sportsSales.reduce((acc, s) => acc + Number(s.total || 0), 0);

  return (
    <div style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.35rem' }}>Orders & Kitchen Management</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Unified live operations for café kitchen tickets, sports merchandise, and kitchen inventory.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <CurrentDate />
          <button
            onClick={fetchData}
            className="btn"
            style={{
              border: '1px solid var(--border-subtle)',
              padding: '0.55rem 1.1rem',
              fontSize: '0.85rem',
              background: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600
            }}
          >
            ↻ Refresh Orders
          </button>
        </div>
      </div>

      {/* Global Error Alert */}
      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ✕ {error}
        </div>
      )}

      {/* CAFÉ & BAR SUMMARY BANNER */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>☕</span> CAFÉ & BAR SUMMARY
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem', fontWeight: 600 }}>
              Total Café Revenue
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              ₹{cafeStats.totalCafeRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              All-time food & drinks revenue
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem', fontWeight: 600 }}>
              Today's Café Revenue
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
              ₹{cafeStats.todayCafeRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Completed café orders today
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem', fontWeight: 600 }}>
              Orders Today
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {cafeStats.ordersToday}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Total orders placed today
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem', fontWeight: 600 }}>
              Active Kitchen Orders
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: cafeStats.activeKitchenOrders > 0 ? '#ef4444' : '#10b981' }}>
              {cafeStats.activeKitchenOrders}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              In queue / preparing now
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 6: COMPACT "TODAY'S KITCHEN" SUMMARY SECTION */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          borderLeft: '5px solid var(--primary)',
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(59, 130, 246, 0.04) 100%)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>⏱️</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', letterSpacing: '0.03em' }}>Today's Kitchen Summary</h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Calculated from live database orders placed today
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', textAlign: 'center' }}>
          <div style={{ padding: '0.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>New Orders</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.2rem' }}>{todayNewCount}</div>
          </div>

          <div style={{ padding: '0.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Preparing</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.2rem' }}>{todayPrepCount}</div>
          </div>

          <div style={{ padding: '0.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ready</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>{todayReadyCount}</div>
          </div>

          <div style={{ padding: '0.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Completed</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6b7280', marginTop: '0.2rem' }}>{todayCompletedCount}</div>
          </div>

          <div style={{ padding: '0.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700 }}>Urgent Orders</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', marginTop: '0.2rem' }}>{todayUrgentCount}</div>
          </div>

          <div style={{ padding: '0.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--primary)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Café Revenue</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>₹{todayRevenue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* FEATURE 4: DEDICATED KITCHEN LOW-STOCK SECTION */}
      <div
        className="card"
        style={{
          marginBottom: '1.75rem',
          borderLeft: kitchenAlerts.length > 0 ? '4px solid #ef4444' : '4px solid #10b981',
          padding: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: kitchenAlerts.length > 0 ? '0.75rem' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{kitchenAlerts.length > 0 ? '⚠️' : '✓'}</span>
            <h3 style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Kitchen Stock Alerts ({kitchenAlerts.length})
            </h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Café & Kitchen products at or below replenishment threshold (Sports gear excluded)
          </span>
        </div>

        {kitchenAlerts.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
            {kitchenAlerts.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-main)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(239, 68, 68, 0.25)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>⚠️ {item.name}</strong>
                  <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontWeight: 700 }}>
                    {item.category}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span>Stock: <strong style={{ color: item.stock_quantity === 0 ? '#ef4444' : '#f59e0b' }}>{item.stock_quantity}</strong></span>
                  <span style={{ color: 'var(--text-muted)' }}>Threshold: <strong>{item.low_stock_threshold}</strong></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
            ✓ All café ingredients, beverages, and snack inventory are at healthy levels.
          </div>
        )}
      </div>

      {/* TOP-LEVEL TABS: KITCHEN ORDERS vs SPORTS ORDERS */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('kitchen')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.75rem 1.25rem',
            borderBottom: activeTab === 'kitchen' ? '3px solid #f59e0b' : '3px solid transparent',
            color: activeTab === 'kitchen' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: activeTab === 'kitchen' ? 700 : 500,
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>☕</span>
          <span>Kitchen Orders Queue</span>
          <span style={{ background: '#f59e0b', color: 'white', fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>
            {pendingKitchenCount + readyKitchenCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sports')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.75rem 1.25rem',
            borderBottom: activeTab === 'sports' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'sports' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: activeTab === 'sports' ? 700 : 500,
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>🛍️</span>
          <span>Sports Shop Orders</span>
          <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>
            {sportsSales.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT 1: KITCHEN ORDERS QUEUE */}
      {activeTab === 'kitchen' && (
        <div>
          {/* FEATURE 5: SEARCH & COMBINED FILTERS BAR */}
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            {/* Search Input */}
            <div style={{ flex: '1 1 260px', position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Search Order # (e.g. 102) or Member name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '0.55rem 0.85rem', fontSize: '0.88rem' }}
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

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.2rem' }}>Status:</span>
              {['ALL', 'NEW', 'PREPARING', 'READY', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className="btn"
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: statusFilter === st ? 700 : 500,
                    background: statusFilter === st ? 'var(--primary)' : 'var(--bg-main)',
                    color: statusFilter === st ? 'white' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {st === 'ALL' ? `All (${kitchenOrders.length})` : st}
                </button>
              ))}
            </div>

            {/* Priority Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.2rem' }}>Priority:</span>
              {[
                { key: 'ALL', label: 'All' },
                { key: 'NORMAL', label: '🟢 Normal' },
                { key: 'URGENT', label: '🔴 Urgent' }
              ].map((pr) => (
                <button
                  key={pr.key}
                  onClick={() => setPriorityFilter(pr.key)}
                  className="btn"
                  style={{
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: priorityFilter === pr.key ? 700 : 500,
                    background: priorityFilter === pr.key ? (pr.key === 'URGENT' ? '#ef4444' : 'var(--primary)') : 'var(--bg-main)',
                    color: priorityFilter === pr.key ? 'white' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {pr.label}
                </button>
              ))}
            </div>

            {/* Clear Filters Button */}
            {(searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                }}
                className="btn"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* 4-COLUMN KITCHEN LIFECYCLE QUEUE */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {/* NEW Column */}
            {(statusFilter === 'ALL' || statusFilter === 'NEW') && (
              <div>
                <ColumnHeader title="NEW" count={newOrders.length} color="#3b82f6" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {newOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.85rem' }}>
                      No new orders
                    </div>
                  ) : (
                    newOrders.map(renderKitchenCard)
                  )}
                </div>
              </div>
            )}

            {/* PREPARING Column */}
            {(statusFilter === 'ALL' || statusFilter === 'PREPARING') && (
              <div>
                <ColumnHeader title="PREPARING" count={prepOrders.length} color="#f59e0b" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {prepOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.85rem' }}>
                      No orders in preparation
                    </div>
                  ) : (
                    prepOrders.map(renderKitchenCard)
                  )}
                </div>
              </div>
            )}

            {/* READY Column */}
            {(statusFilter === 'ALL' || statusFilter === 'READY') && (
              <div>
                <ColumnHeader title="READY FOR PICKUP" count={readyOrders.length} color="#10b981" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {readyOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.85rem' }}>
                      No orders ready
                    </div>
                  ) : (
                    readyOrders.map(renderKitchenCard)
                  )}
                </div>
              </div>
            )}

            {/* COMPLETED Column */}
            {(statusFilter === 'ALL' || statusFilter === 'COMPLETED') && (
              <div>
                <ColumnHeader title="COMPLETED" count={completedOrders.length} color="#6b7280" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {completedOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.85rem' }}>
                      No completed orders
                    </div>
                  ) : (
                    completedOrders.slice(0, 15).map(renderKitchenCard)
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: SPORTS SHOP ORDERS */}
      {activeTab === 'sports' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Sports Merchandise Orders History</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {sportsSales.length} retail merchandise sales
            </span>
          </div>

          {sportsSales.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No sports equipment or apparel sales recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Receipt #</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Date & Time</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Customer / Member</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Item Purchased</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Quantity</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Unit Price</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Total</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sportsSales.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>#{s.id}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                        {formatDate(s.created_at)} • {formatTime(s.created_at)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <strong>{s.members?.name || 'Club Member'}</strong>
                        {s.members?.email && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.members.email}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{s.products?.name}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', fontWeight: 600 }}>
                          {s.products?.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>{s.quantity}×</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>₹{Number(s.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{Number(s.total).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 700 }}>
                          ✓ Fulfilled
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
