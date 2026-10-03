import React, { useState, useEffect } from 'react';
import { getKitchenOrders, updateOrderStatus } from '@backend/services/cafeService.js';

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = async () => {
    try {
      const data = await getKitchenOrders();
      setOrders(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
      setError(err.message || 'Failed to load kitchen orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Auto-refresh orders every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (orderId, nextStatus) => {
    try {
      setUpdatingId(orderId);
      setError(null);
      await updateOrderStatus(orderId, nextStatus);
      await fetchOrders();
    } catch (err) {
      setError(err.message || 'Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Group orders by status
  const newOrders = orders.filter((o) => o.status === 'NEW');
  const prepOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');

  // Format timestamp helper
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderOrderCard = (order) => {
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
        {/* Order Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
            Order #{order.id}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {formatTime(order.created_at)}
          </span>
        </div>

        {/* Member Info */}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Customer: <strong style={{ color: 'var(--text-main)' }}>{memberName}</strong>
        </div>

        {/* Line Items */}
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

        {/* Total & Discount */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.9rem', paddingTop: '0.25rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {Number(order.discount_amount) > 0 && `(Disc: -$${Number(order.discount_amount).toFixed(2)})`}
          </span>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
            Total: ${Number(order.total).toFixed(2)}
          </span>
        </div>

        {/* Action Button based on status */}
        <div style={{ marginTop: '0.25rem' }}>
          {order.status === 'NEW' && (
            <button
              className="btn btn-primary"
              disabled={isUpdating}
              onClick={() => handleStatusChange(order.id, 'PREPARING')}
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
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
                padding: '0.5rem',
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
                padding: '0.5rem',
                fontSize: '0.85rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                fontWeight: 600
              }}
            >
              {isUpdating ? 'Updating...' : 'Complete'}
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

  if (loading && orders.length === 0) {
    return <div style={{ padding: '2rem' }}>Loading kitchen orders queue...</div>;
  }

  return (
    <div style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.35rem' }}>Kitchen Orders Queue</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Live Café-Bar order processing and kitchen lifecycle management.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="btn"
          style={{
            border: '1px solid var(--border-subtle)',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            background: 'var(--bg-surface)'
          }}
        >
          ↻ Refresh Orders
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ✕ {error}
        </div>
      )}

      {/* 4 Status Columns */}
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
              newOrders.map(renderOrderCard)
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
              prepOrders.map(renderOrderCard)
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
              readyOrders.map(renderOrderCard)
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
              completedOrders.slice(0, 10).map(renderOrderCard)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
