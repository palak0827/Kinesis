import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';

export default function AdminOperations() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    bookings: [],
    lowStock: [],
    recentSales: []
  });

  useEffect(() => {
    async function fetchOps() {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const { data: bookings } = await supabase.from('bookings').select('*, courts(*)').eq('booking_date', todayStr).eq('status', 'confirmed').order('start_time');
      const { data: lowStock } = await supabase.from('products').select('*').lte('stock_quantity', 5).order('stock_quantity');
      const { data: recentSales } = await supabase.from('sales').select('*, products(*)').order('created_at', { ascending: false }).limit(5);
      
      setData({
        bookings: bookings || [],
        lowStock: lowStock || [],
        recentSales: recentSales || []
      });
      setLoading(false);
    }
    fetchOps();
  }, []);

  if (loading) return <div>Loading operations overview...</div>;

  return (
    <div style={{ maxWidth: '1200px' }}>
      <h1 style={{ marginBottom: '2rem' }}>Operations Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>Today's Court Schedule</h3>
          {data.bookings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.bookings.map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0' }}>{b.courts?.name}</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.courts?.sport}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600 }}>
                    {b.start_time.slice(0,5)} - {b.end_time.slice(0,5)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No bookings scheduled for today.</p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>Low Stock Alerts</h3>
            {data.lowStock.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.lowStock.map(p => (
                  <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem' }}>{p.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.category}</span>
                    </div>
                    <span style={{ 
                      fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
                      background: p.stock_quantity === 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                      color: p.stock_quantity === 0 ? '#ef4444' : '#f59e0b'
                    }}>
                      {p.stock_quantity} Left
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Inventory is healthy.</p>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>Recent Sales</h3>
            {data.recentSales.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.recentSales.map(s => (
                  <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem' }}>{s.products?.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.quantity}x @ ${s.unit_price}</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>
                      +${s.total}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No recent sales.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
