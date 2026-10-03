import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { getKitchenOrders, updateOrderStatus } from '@backend/services/cafeService.js';

export default function Kitchen() {
  const [activeTab, setActiveTab] = useState('kitchen'); // 'kitchen' or 'sports'
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [sportsSales, setSportsSales] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);

      // 1. Fetch live kitchen orders (from cafe_orders joined with line items & members)
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
      const filteredSports = (salesData || []).filter(s => {
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

      // 3. Fetch low stock count for KPI indicator
      const { count: lowCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lte('stock_quantity', 5);
      setLowStockCount(lowCount || 0);

    } catch (err) {
      console.error('Error fetching admin orders data:', err);
      setError(err.message || 'Failed to load order streams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 10 seconds for real-time demo synchronization
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

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

  // Group kitchen orders by lifecycle stage
  const newOrders = kitchenOrders.filter((o) => o.status === 'NEW');
  const prepOrders = kitchenOrders.filter((o) => o.status === 'PREPARING');
  const readyOrders = kitchenOrders.filter((o) => o.status === 'READY');
  const completedOrders = kitchenOrders.filter((o) => o.status === 'COMPLETED');

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

  // Kitchen Order Card Component
  const renderKitchenCard = (order) => {
    const isUpdating = updatingId === order.id;
    const items = order.cafe_order_items || [];
    const memberName = order.members?.name || (order.member_id ? `Member #${order.member_id}` : 'Guest');

    return (
      <div
        key={order.id}
        className="card"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
        }}
      >
        {/* Ticket Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
            Ticket #{order.id}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {formatTime(order.created_at)}
          </span>
        </div>

        {/* Member Name */}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Customer: <strong style={{ color: 'var(--text-main)' }}>{memberName}</strong>
        </div>

        {/* Line Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--bg-main)', padding: '0.6rem', borderRadius: '4px' }}>
          {items.map((item, idx) => (
            <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>
                <strong>{item.quantity}×</strong> {item.products?.name || `Product #${item.product_id}`}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                ${Number(item.total).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.9rem', paddingTop: '0.25rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {Number(order.discount_amount) > 0 && `(Disc: -$${Number(order.discount_amount).toFixed(2)})`}
          </span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)' }}>
            Total: ${Number(order.total).toFixed(2)}
          </span>
        </div>

        {/* Action Button */}
        <div style={{ marginTop: '0.25rem' }}>
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
            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#10b981', fontWeight: 600, padding: '0.4rem' }}>
              ✓ Completed
            </div>
          )}
        </div>
      </div>
    );
  };

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

  if (loading && kitchenOrders.length === 0 && sportsSales.length === 0) {
    return <div style={{ padding: '2rem' }}>Loading club order streams...</div>;
  }

  // Calculate summary metrics
  const pendingKitchenCount = newOrders.length + prepOrders.length;
  const readyKitchenCount = readyOrders.length;
  const totalSportsRevenue = sportsSales.reduce((acc, s) => acc + Number(s.total || 0), 0);

  return (
    <div style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.35rem' }}>Orders & Kitchen Management</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Unified administration for sports merchandise orders and live café kitchen tickets.
          </p>
        </div>

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

      {/* Global Error Alert */}
      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ✕ {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Kitchen Tickets</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.35rem 0' }}>{pendingKitchenCount}</div>
          <div style={{ fontSize: '0.8rem', color: '#f59e0b' }}>{newOrders.length} New • {prepOrders.length} Preparing</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ready for Pickup</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.35rem 0', color: '#10b981' }}>{readyKitchenCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Awaiting member collection</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Sports Shop Sales</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.35rem 0', color: 'var(--primary)' }}>${totalSportsRevenue.toFixed(2)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sportsSales.length} retail merchandise orders</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: lowStockCount > 0 ? '4px solid #ef4444' : '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Low Stock Alerts</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.35rem 0', color: lowStockCount > 0 ? '#ef4444' : 'var(--text-main)' }}>
            {lowStockCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: lowStockCount > 0 ? '#ef4444' : '#10b981' }}>
            {lowStockCount > 0 ? 'Action required in Inventory' : 'Healthy inventory levels'}
          </div>
        </div>
      </div>

      {/* TOP-LEVEL TABS: KITCHEN ORDERS vs SPORTS ORDERS */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.75rem' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* NEW Orders */}
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

          {/* PREPARING Orders */}
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

          {/* READY Orders */}
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

          {/* COMPLETED Orders */}
          <div>
            <ColumnHeader title="COMPLETED" count={completedOrders.length} color="#6b7280" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {completedOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem', fontSize: '0.85rem' }}>
                  No completed orders
                </div>
              ) : (
                completedOrders.slice(0, 10).map(renderKitchenCard)
              )}
            </div>
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
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>${Number(s.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                        ${Number(s.total).toFixed(2)}
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
