import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { getMemberCafeOrders } from '@backend/services/cafeService.js';

export default function CafeOrders({ navigate }) {
  const { memberProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'COMPLETED'
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    if (!memberProfile?.id) return;
    try {
      setError(null);
      const data = await getMemberCafeOrders(memberProfile.id);
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching member café orders:', err);
      setError(err.message || 'Unable to retrieve your café order history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Poll for live kitchen status updates every 8 seconds
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [memberProfile?.id]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (filter === 'ACTIVE') {
      return o.status === 'NEW' || o.status === 'PREPARING' || o.status === 'READY';
    }
    if (filter === 'COMPLETED') {
      return o.status === 'COMPLETED';
    }
    return true;
  });

  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'NEW') {
      return { label: 'Order Received', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
    }
    if (s === 'PREPARING') {
      return { label: 'In Kitchen (Preparing)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
    }
    if (s === 'READY') {
      return { label: 'Ready for Pickup', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
    }
    if (s === 'COMPLETED') {
      return { label: 'Completed', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' };
    }
    return { label: s, color: 'var(--text-muted)', bg: 'var(--bg-main)' };
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.4rem' }}>My Café Orders</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
            Live status and complete receipt history for your food, drinks, and snacks.
          </p>
        </div>

        <button
          onClick={() => navigate('shop')}
          className="btn btn-primary"
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', fontWeight: 600 }}
        >
          ☕ Order at Café-Bar
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ✕ {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        {[
          { key: 'ALL', label: `All Orders (${orders.length})` },
          { key: 'ACTIVE', label: `Active in Kitchen (${orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length})` },
          { key: 'COMPLETED', label: `Completed (${orders.filter(o => o.status === 'COMPLETED').length})` }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="btn"
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.85rem',
              fontWeight: filter === tab.key ? 700 : 500,
              background: filter === tab.key ? 'var(--primary)' : 'var(--bg-surface)',
              color: filter === tab.key ? 'white' : 'var(--text-muted)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading your café orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>☕</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No Café Orders Found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
            {filter === 'ACTIVE'
              ? 'You have no active orders currently being prepared in the kitchen.'
              : 'You have not placed any orders at the Café & Bar yet.'}
          </p>
          <button
            onClick={() => navigate('shop')}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.5rem', fontWeight: 600 }}
          >
            Browse Café & Bar Menu
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            const items = order.cafe_order_items || [];
            const isUrgent = (order.priority || 'NORMAL') === 'URGENT';

            return (
              <div
                key={order.id}
                className="card"
                onClick={() => setSelectedOrder(order)}
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: isUrgent ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                  borderLeft: `5px solid ${badge.color}`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Left Info */}
                <div style={{ flex: 1, paddingRight: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                      #{order.id}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        background: badge.bg,
                        color: badge.color
                      }}
                    >
                      {badge.label}
                    </span>
                    {isUrgent && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444'
                        }}
                      >
                        🔴 URGENT
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {formatDate(order.created_at)}, {formatTime(order.created_at)}
                  </div>

                  {/* Summary of Items */}
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {items.map((it) => (
                      <span key={it.id} style={{ marginRight: '0.8rem', display: 'inline-block' }}>
                        {it.products?.name || `Product #${it.product_id}`} <strong style={{ color: 'var(--primary)' }}>× {it.quantity}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      ₹{Number(order.total).toFixed(2)}
                    </div>
                    {Number(order.discount_amount) > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                        Saved ₹{Number(order.discount_amount).toFixed(2)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      View Bill
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '1.75rem',
              borderRadius: 'var(--radius-md)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.35rem' }}>Café Order #{selectedOrder.id}</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Placed on {formatDate(selectedOrder.created_at)} at {formatTime(selectedOrder.created_at)}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Lifecycle Progress Bar */}
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.75rem' }}>
                Order Status Lifecycle
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                {['NEW', 'PREPARING', 'READY', 'COMPLETED'].map((step, idx) => {
                  const stages = ['NEW', 'PREPARING', 'READY', 'COMPLETED'];
                  const currentIndex = stages.indexOf(selectedOrder.status);
                  const isPassed = idx <= currentIndex;
                  const isCurrent = idx === currentIndex;

                  return (
                    <div key={step} style={{ textAlign: 'center', flex: 1, position: 'relative' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: isPassed ? '#10b981' : 'var(--bg-surface)',
                          color: isPassed ? 'white' : 'var(--text-muted)',
                          border: isCurrent ? '3px solid #10b981' : '2px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 0.4rem auto',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {isPassed ? '✓' : idx + 1}
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {step}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Itemized Table */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Order Items
              </div>
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '0.6rem 0.75rem' }}>Item</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Price</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.cafe_order_items || []).map((it) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>
                          {it.products?.name || `Product #${it.product_id}`}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>{it.quantity}</td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                          ₹{Number(it.unit_price).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>
                          ₹{Number(it.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Summary */}
            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span>₹{Number(selectedOrder.subtotal || selectedOrder.total).toFixed(2)}</span>
              </div>
              {Number(selectedOrder.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>Member Tier Bar Discount:</span>
                  <span>-₹{Number(selectedOrder.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <span>Final Amount Paid:</span>
                <span>₹{Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1.25rem' }}
              >
                Close Bill
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ padding: '0.55rem 1.25rem', fontWeight: 700 }}
              >
                Print / Save Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
