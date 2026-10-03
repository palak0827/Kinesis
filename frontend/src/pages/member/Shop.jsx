import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { useAuth } from '../../AuthContext.jsx';
import { recordSale } from '@backend/services/inventoryService.js';

export default function Shop() {
  const { memberProfile } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [purchasingId, setPurchasingId] = useState(null);

  useEffect(() => {
    async function loadShop() {
      try {
        const { data, error: err } = await supabase
          .from('products')
          .select('*')
          .order('category');
        if (err) throw err;
        setProducts(data || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadShop();
  }, []);

  // Calculate discount based on whether item is Cafe/Bar or Pro Shop equipment
  const getProductDiscountPercent = (product) => {
    if (!memberProfile?.membership_plans) return 0;
    const isBarItem = product.category === 'Drinks & Nutrition' || product.category === 'Café' || product.category === 'Bar';
    return isBarItem
      ? Number(memberProfile.membership_plans.bar_discount || 0)
      : Number(memberProfile.membership_plans.shop_discount || 0);
  };

  const getDiscountedPrice = (product) => {
    const discount = getProductDiscountPercent(product);
    return (Number(product.price) * (1 - discount / 100)).toFixed(2);
  };

  const handlePurchase = async (product) => {
    setError(null);
    setSuccessMessage(null);
    setPurchasingId(product.id);

    try {
      await recordSale({
        productId: product.id,
        memberId: memberProfile?.id || null,
        quantity: 1
      });

      // Update stock locally in UI
      setProducts(prev =>
        prev.map(p => (p.id === product.id ? { ...p, stock_quantity: p.stock_quantity - 1 } : p))
      );

      const finalPrice = getDiscountedPrice(product);
      setSuccessMessage(`Order confirmed! You bought "${product.name}" for $${finalPrice}.`);
    } catch (err) {
      setError(err.message || 'Purchase could not be completed.');
    } finally {
      setPurchasingId(null);
    }
  };

  const filteredProducts = products.filter(p => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'pro-shop') {
      return p.category !== 'Drinks & Nutrition' && p.category !== 'Café' && p.category !== 'Bar';
    }
    if (activeCategory === 'cafe-bar') {
      return p.category === 'Drinks & Nutrition' || p.category === 'Café' || p.category === 'Bar';
    }
    return true;
  });

  if (loading) return <div style={{ padding: '2rem' }}>Loading club shop & café...</div>;

  return (
    <div style={{ maxWidth: '1000px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Pro Shop & Café-Bar</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Sports gear, performance drinks, and healthy snacks.</p>
        </div>
        
        {memberProfile?.membership_plans && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--bg-surface)', padding: '0.5rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              Shop Discount: <strong style={{ color: 'var(--primary)' }}>{memberProfile.membership_plans.shop_discount}%</strong>
            </span>
            <span style={{ background: 'var(--bg-surface)', padding: '0.5rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              Bar Discount: <strong style={{ color: 'var(--primary)' }}>{memberProfile.membership_plans.bar_discount}%</strong>
            </span>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveCategory('all')}
          className="btn"
          style={{
            background: activeCategory === 'all' ? 'var(--primary)' : 'var(--bg-surface)',
            color: activeCategory === 'all' ? 'white' : 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            padding: '0.5rem 1rem',
            fontSize: '0.9rem'
          }}
        >
          All Items ({products.length})
        </button>
        <button
          onClick={() => setActiveCategory('pro-shop')}
          className="btn"
          style={{
            background: activeCategory === 'pro-shop' ? 'var(--primary)' : 'var(--bg-surface)',
            color: activeCategory === 'pro-shop' ? 'white' : 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            padding: '0.5rem 1rem',
            fontSize: '0.9rem'
          }}
        >
          Pro Shop Equipment
        </button>
        <button
          onClick={() => setActiveCategory('cafe-bar')}
          className="btn"
          style={{
            background: activeCategory === 'cafe-bar' ? 'var(--primary)' : 'var(--bg-surface)',
            color: activeCategory === 'cafe-bar' ? 'white' : 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            padding: '0.5rem 1rem',
            fontSize: '0.9rem'
          }}
        >
          Café-Bar & Nutrition
        </button>
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ✓ {successMessage}
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          ✕ {error}
        </div>
      )}

      {/* Products Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.75rem' }}>
        {filteredProducts.map(p => {
          const discountPercent = getProductDiscountPercent(p);
          const finalPrice = getDiscountedPrice(p);
          const isPurchasing = purchasingId === p.id;
          const isOutOfStock = p.stock_quantity <= 0;

          // Icon representation by category
          let categoryIcon = '🎾';
          if (p.category === 'Apparel') categoryIcon = '👕';
          else if (p.category === 'Accessories') categoryIcon = '🎒';
          else if (p.category === 'Drinks & Nutrition' || p.category === 'Café' || p.category === 'Bar') categoryIcon = '🥤';

          return (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '140px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '3rem' }}>{categoryIcon}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {p.category}
                </span>
                <span style={{ fontSize: '0.75rem', color: isOutOfStock ? '#ef4444' : 'var(--text-muted)' }}>
                  {isOutOfStock ? 'Sold Out' : `${p.stock_quantity} in stock`}
                </span>
              </div>

              <h3 style={{ fontSize: '1.05rem', margin: '0 0 1rem 0' }}>{p.name}</h3>

              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {discountPercent > 0 ? (
                    <div>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.85rem', marginRight: '0.4rem' }}>
                        ${p.price}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--text-main)' }}>
                        ${finalPrice}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                        {discountPercent}% member discount
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>${p.price}</span>
                  )}
                </div>

                <button
                  className="btn btn-primary"
                  disabled={isOutOfStock || isPurchasing}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                  onClick={() => handlePurchase(p)}
                >
                  {isPurchasing ? 'Processing...' : isOutOfStock ? 'Out of Stock' : 'Order Now'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
