import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { useAuth } from '../../AuthContext.jsx';

export default function Shop() {
  const { memberProfile } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadShop() {
      try {
        const { data, error: err } = await supabase.from('products').select('*').order('category');
        if (err) throw err;
        setProducts(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadShop();
  }, []);

  const getDiscountedPrice = (price) => {
    const discount = memberProfile?.membership_plans?.shop_discount || 0;
    return (price * (1 - discount / 100)).toFixed(2);
  };

  if (loading) return <div>Loading shop...</div>;
  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Pro Shop</h1>
          <p style={{ color: 'var(--text-muted)' }}>Premium gear and accessories.</p>
        </div>
        {memberProfile?.membership_plans?.shop_discount > 0 && (
          <div style={{ background: 'var(--surface-hover)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{memberProfile.membership_plans.shop_discount}% OFF</span> applied!
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
        {products.map(p => (
          <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '150px', background: 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '2rem' }}>{p.category === 'Rackets' ? '🎾' : p.category === 'Balls' ? '🎾' : '👕'}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{p.category}</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{p.name}</h3>
            
            <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {memberProfile?.membership_plans?.shop_discount > 0 ? (
                  <>
                    <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '0.5rem' }}>${p.price}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>${getDiscountedPrice(p.price)}</span>
                  </>
                ) : (
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>${p.price}</span>
                )}
              </div>
              <button 
                className="btn btn-primary" 
                disabled={p.stock_quantity <= 0}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                onClick={() => alert('Added to cart! (Cart logic out of scope for auth task)')}
              >
                {p.stock_quantity > 0 ? 'Buy' : 'Out of Stock'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
