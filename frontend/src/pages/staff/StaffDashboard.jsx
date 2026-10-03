import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import CurrentDate from '../../components/CurrentDate.jsx';

export default function StaffDashboard({ navigate }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalUnits: 0,
    lowStockItems: []
  });

  useEffect(() => {
    async function fetchStaffStats() {
      try {
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .order('name');

        if (products) {
          const totalProducts = products.length;
          let lowStockCount = 0;
          let outOfStockCount = 0;
          let totalUnits = 0;
          const lowStockItems = [];

          products.forEach(p => {
            totalUnits += (p.stock_quantity || 0);
            if (p.stock_quantity === 0 || p.availability_status === 'OUT_OF_STOCK') {
              outOfStockCount += 1;
              lowStockItems.push(p);
            } else if (p.stock_quantity <= (p.low_stock_threshold || 5)) {
              lowStockCount += 1;
              lowStockItems.push(p);
            }
          });

          setStats({
            totalProducts,
            lowStockCount,
            outOfStockCount,
            totalUnits,
            lowStockItems: lowStockItems.slice(0, 6)
          });
        }
      } catch (err) {
        console.error('Error fetching staff stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStaffStats();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading staff operations...</div>;
  }

  return (
    <div style={{ maxWidth: '1100px' }}>
      
      {/* Header with CurrentDate */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.2rem' }}>Staff Operations Dashboard</h1>
          <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-muted)' }}>
            Club stock management, replenishment alerts, and item availability controls
          </p>
        </div>
        <CurrentDate />
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Active Products</p>
          <h2 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '2rem' }}>{stats.totalProducts}</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Across Gear & Café items</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low Stock Warnings</p>
          <h2 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '2rem', color: stats.lowStockCount > 0 ? '#f59e0b' : 'inherit' }}>
            {stats.lowStockCount}
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>At or below threshold</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Out of Stock</p>
          <h2 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '2rem', color: stats.outOfStockCount > 0 ? '#ef4444' : 'inherit' }}>
            {stats.outOfStockCount}
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Immediate restock required</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inventory Units</p>
          <h2 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '2rem' }}>{stats.totalUnits}</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total physical units in stock</span>
        </div>

      </div>

      {/* Quick Action Navigation Banner */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', background: 'var(--bg-surface)', padding: '1.5rem 2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0' }}>Inventory Controls & Availability</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Adjust physical stock counts, toggle product availability, and manage replenishment limits.
          </p>
        </div>
        <button onClick={() => navigate('staff-inventory')} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>
          Open Staff Inventory &rarr;
        </button>
      </div>

      {/* Critical Stock Attention List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Stock Attention Needed</h3>
          <button onClick={() => navigate('staff-inventory')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            View Full Inventory
          </button>
        </div>

        {stats.lowStockItems.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600 }}>Product Name</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, textAlign: 'center' }}>Current Stock</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, textAlign: 'center' }}>Threshold</th>
                <th style={{ padding: '0.85rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.lowStockItems.map((item, idx) => {
                const isOut = item.stock_quantity === 0;
                return (
                  <tr key={item.id} style={{ borderBottom: idx < stats.lowStockItems.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{item.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{item.category}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: isOut ? '#ef4444' : '#f59e0b' }}>
                      {item.stock_quantity}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {item.low_stock_threshold || 5}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => navigate('staff-inventory')}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        Update Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            All product inventory levels are currently healthy!
          </div>
        )}
      </div>

    </div>
  );
}
