import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInventory() {
      const { data } = await supabase.from('products').select('*').order('category');
      if (data) setProducts(data);
      setLoading(false);
    }
    fetchInventory();
  }, []);

  if (loading) return <div>Loading inventory...</div>;

  return (
    <div style={{ maxWidth: '1000px' }}>
      <h1 style={{ marginBottom: '2rem' }}>Inventory Management</h1>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {products.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Product Name</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Price</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Stock Quantity</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const isOut = p.stock_quantity === 0;
                const isLow = p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold;
                const status = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy';
                const statusColor = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';
                const statusBg = isOut ? 'rgba(239,68,68,0.1)' : isLow ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)';

                return (
                  <tr key={p.id} style={{ borderBottom: i < products.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <td style={{ padding: '1.25rem 1rem', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '1.25rem 1rem', color: 'var(--text-muted)' }}>{p.category}</td>
                    <td style={{ padding: '1.25rem 1rem' }}>${p.price}</td>
                    <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 600 }}>{p.stock_quantity}</td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span style={{ 
                        fontSize: '0.8rem', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600,
                        background: statusBg, color: statusColor
                      }}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No products found in database.</div>
        )}
      </div>
    </div>
  );
}
