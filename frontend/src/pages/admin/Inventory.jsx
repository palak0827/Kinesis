import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { getProductImage } from '../../utils/productImages.js';
import { getGearRevenueStats, getProductBusinessType } from '@backend/services/revenueService.js';
import CurrentDate from '../../components/CurrentDate.jsx';

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL', 'GEAR', 'CAFE'
  const [stats, setStats] = useState({
    totalGearRevenue: 0,
    todayGearRevenue: 0,
    gearSalesCount: 0,
    lowStockCount: 0
  });

  useEffect(() => {
    async function fetchInventory() {
      const { data } = await supabase.from('products').select('*').order('category');
      if (data) setProducts(data);

      try {
        const gearStats = await getGearRevenueStats();
        setStats(gearStats);
      } catch (err) {
        console.error('Error fetching gear revenue stats:', err);
      }

      setLoading(false);
    }
    fetchInventory();
  }, []);

  if (loading) return <div>Loading inventory...</div>;

  const displayedProducts = products.filter(p => {
    if (categoryFilter === 'ALL') return true;
    const type = getProductBusinessType(p);
    return type === categoryFilter;
  });

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.2rem' }}>Gear Shop & Inventory</h1>
          <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-muted)' }}>
            Central inventory tracking and sports merchandise performance
          </p>
        </div>
        <CurrentDate />
      </div>

      {/* GEAR SHOP SUMMARY BANNER */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🏸</span> GEAR SHOP SUMMARY
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem', fontWeight: 600 }}>
              Total Gear Revenue
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              ₹{stats.totalGearRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Sports gear & equipment sales
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem', fontWeight: 600 }}>
              Today's Gear Revenue
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6', fontFamily: 'var(--font-mono)' }}>
              ₹{stats.todayGearRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Completed today
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem', fontWeight: 600 }}>
              Orders / Sales
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {stats.gearSalesCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Total gear transactions
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem', fontWeight: 600 }}>
              Low Stock
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: stats.lowStockCount > 0 ? '#f59e0b' : '#10b981' }}>
              {stats.lowStockCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Items needing replenishment
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <button
          onClick={() => setCategoryFilter('ALL')}
          className="btn"
          style={{
            padding: '0.45rem 1rem',
            fontSize: '0.82rem',
            background: categoryFilter === 'ALL' ? 'var(--primary)' : 'var(--bg-surface)',
            color: categoryFilter === 'ALL' ? 'white' : 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer'
          }}
        >
          All Items ({products.length})
        </button>
        <button
          onClick={() => setCategoryFilter('GEAR')}
          className="btn"
          style={{
            padding: '0.45rem 1rem',
            fontSize: '0.82rem',
            background: categoryFilter === 'GEAR' ? 'var(--primary)' : 'var(--bg-surface)',
            color: categoryFilter === 'GEAR' ? 'white' : 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer'
          }}
        >
          🏸 Gear & Apparel ({products.filter(p => getProductBusinessType(p) === 'GEAR').length})
        </button>
        <button
          onClick={() => setCategoryFilter('CAFE')}
          className="btn"
          style={{
            padding: '0.45rem 1rem',
            fontSize: '0.82rem',
            background: categoryFilter === 'CAFE' ? 'var(--primary)' : 'var(--bg-surface)',
            color: categoryFilter === 'CAFE' ? 'white' : 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer'
          }}
        >
          ☕ Café & Drinks ({products.filter(p => getProductBusinessType(p) === 'CAFE').length})
        </button>
      </div>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {products.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem', width: '56px' }}>Item</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Product Name</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Current Price</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Stock</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Threshold</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map((p, i) => {
                const isTemp = p.availability_status === 'TEMPORARILY_UNAVAILABLE';
                const isOut = p.stock_quantity === 0 || p.availability_status === 'OUT_OF_STOCK';
                const isLow = !isOut && p.stock_quantity <= (p.low_stock_threshold || 5);
                
                const status = isTemp ? 'Temp Unavailable' : isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';
                const statusColor = isTemp ? '#8b5cf6' : isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';
                const statusBg = isTemp ? 'rgba(139,92,246,0.1)' : isOut ? 'rgba(239,68,68,0.1)' : isLow ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)';

                return (
                  <tr key={p.id} style={{ borderBottom: i < products.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <img
                        src={getProductImage(p)}
                        alt={p.name}
                        style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                      />
                    </td>
                    <td style={{ padding: '1.25rem 1rem', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '1.25rem 1rem', color: 'var(--text-muted)' }}>{p.category}</td>
                    <td style={{ padding: '1.25rem 1rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>₹{Number(p.price).toFixed(2)}</td>
                    <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 600 }}>{p.stock_quantity}</td>
                    <td style={{ padding: '1.25rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }}>{p.low_stock_threshold || 5}</td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span style={{ 
                        fontSize: '0.78rem', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600,
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
