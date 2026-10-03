import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { useAuth } from '../../AuthContext.jsx';
import { createCafeOrder } from '@backend/services/cafeService.js';

export default function Shop() {
  const { memberProfile } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Top-Level Shopping Section Switch: 'sports' vs 'cafe'
  const [shopSection, setShopSection] = useState('sports');

  // Subcategory filters
  const [sportsCategory, setSportsCategory] = useState('all');
  const [cafeCategory, setCafeCategory] = useState('all');

  // Quantity selected for each product card before adding to cart
  const [quantities, setQuantities] = useState({});

  // Cart state: array of { productId, name, price, category, quantity, maxStock }
  const [cart, setCart] = useState([]);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Load products from database
  const loadProducts = async () => {
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .order('id');
      if (err) throw err;
      setProducts(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Helper to determine if a product belongs to the Cafe & Kitchen
  const isCafeItem = (p) => {
    const cat = (p.category || '').toLowerCase();
    return (
      cat.includes('drink') ||
      cat.includes('café') ||
      cat.includes('cafe') ||
      cat.includes('bar') ||
      cat.includes('food') ||
      cat.includes('nutrition')
    );
  };

  // Discounts based on membership plan
  const shopDiscountPercent = Number(memberProfile?.membership_plans?.shop_discount || 0);
  const barDiscountPercent = Number(memberProfile?.membership_plans?.bar_discount || 0);

  // Helper to get applicable discount for a product
  const getProductDiscountPercent = (p) => {
    if (!memberProfile?.membership_plans) return 0;
    return isCafeItem(p) ? barDiscountPercent : shopDiscountPercent;
  };

  const getDiscountedPrice = (p) => {
    const discount = getProductDiscountPercent(p);
    return (Number(p.price) * (1 - discount / 100)).toFixed(2);
  };

  // Quantity controls on product card
  const getSelectedQuantity = (productId) => quantities[productId] || 1;

  const handleQuantityChange = (productId, delta, maxStock) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(maxStock, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  // Add item to cart
  const handleAddToCart = (product) => {
    setError(null);
    setSuccessMessage(null);

    const qtyToAdd = getSelectedQuantity(product.id);

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        const newQty = Math.min(product.stock_quantity, existing.quantity + qtyToAdd);
        return prev.map(item =>
          item.productId === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: Number(product.price),
            category: product.category,
            quantity: qtyToAdd,
            maxStock: product.stock_quantity
          }
        ];
      }
    });

    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  // Update quantity directly inside cart
  const handleUpdateCartQty = (productId, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.maxStock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Cart Calculations with Strict Category Discount Separation
  const cartSubtotal = Number(
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
  );

  // Each item gets ONLY its corresponding discount:
  // Sports gear -> shop_discount
  // Cafe food/drinks -> bar_discount
  const cartDiscountAmount = Number(
    cart
      .reduce((sum, item) => {
        const rate = isCafeItem(item) ? barDiscountPercent : shopDiscountPercent;
        const itemDisc = (item.price * item.quantity * rate) / 100;
        return sum + itemDisc;
      }, 0)
      .toFixed(2)
  );

  const cartFinalTotal = Number(
    Math.max(0, cartSubtotal - cartDiscountAmount).toFixed(2)
  );

  // Place Order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    setError(null);
    setSuccessMessage(null);
    setPlacingOrder(true);

    try {
      const itemsToOrder = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      const createdOrder = await createCafeOrder({
        memberId: memberProfile?.id || null,
        items: itemsToOrder
      });

      setSuccessMessage(
        `Order #${createdOrder.id} placed successfully! Thank you for your order.`
      );
      setCart([]);
      await loadProducts();
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  // Filter products based on active top-level shopping mode and subcategory
  const filteredProducts = products.filter(p => {
    const isCafe = isCafeItem(p);

    if (shopSection === 'sports') {
      if (isCafe) return false;
      if (sportsCategory === 'all') return true;
      if (sportsCategory === 'rackets') return p.category === 'Rackets';
      if (sportsCategory === 'balls') return p.category === 'Balls';
      if (sportsCategory === 'apparel') return p.category === 'Apparel';
      if (sportsCategory === 'accessories') return p.category === 'Accessories';
      return true;
    } else {
      if (!isCafe) return false;
      if (cafeCategory === 'all') return true;
      if (cafeCategory === 'drinks') return p.category === 'Drinks & Nutrition' && (p.name.includes('Drink') || p.name.includes('Hydro') || p.name.includes('Coffee'));
      if (cafeCategory === 'snacks') return p.name.includes('Bar') || p.name.includes('Bowl');
      if (cafeCategory === 'fresh') return p.category === 'Café' || p.name.includes('Panini') || p.name.includes('Coffee');
      return true;
    }
  });

  if (loading) return <div style={{ padding: '2rem' }}>Loading club shop & café...</div>;

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Club Shopping & Dining</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Official pro gear, performance nutrition, and freshly prepared café orders.
          </p>
        </div>

        {memberProfile?.membership_plans && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--bg-surface)', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              Shop Discount: <strong style={{ color: 'var(--primary)' }}>{shopDiscountPercent}%</strong>
            </span>
            <span style={{ background: 'var(--bg-surface)', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              Bar Discount: <strong style={{ color: 'var(--primary)' }}>{barDiscountPercent}%</strong>
            </span>
          </div>
        )}
      </div>

      {/* TOP-LEVEL SWITCH: SPORTS SHOP vs CAFE & KITCHEN */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => { setShopSection('sports'); setSportsCategory('all'); }}
          className="btn"
          style={{
            flex: 1,
            padding: '1.1rem',
            fontSize: '1.1rem',
            fontWeight: 700,
            background: shopSection === 'sports' ? 'var(--primary)' : 'var(--bg-surface)',
            color: shopSection === 'sports' ? 'white' : 'var(--text-main)',
            border: shopSection === 'sports' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: shopSection === 'sports' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <span>🛍️</span>
          <span>Sports Pro Shop</span>
        </button>

        <button
          onClick={() => { setShopSection('cafe'); setCafeCategory('all'); }}
          className="btn"
          style={{
            flex: 1,
            padding: '1.1rem',
            fontSize: '1.1rem',
            fontWeight: 700,
            background: shopSection === 'cafe' ? '#f59e0b' : 'var(--bg-surface)',
            color: shopSection === 'cafe' ? 'white' : 'var(--text-main)',
            border: shopSection === 'cafe' ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: shopSection === 'cafe' ? '0 4px 12px rgba(245,158,11,0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <span>☕</span>
          <span>Café & Kitchen</span>
        </button>
      </div>

      {/* SECTION BANNER & SUB-FILTERS */}
      {shopSection === 'sports' ? (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              <strong>Sports Equipment & Apparel:</strong> Your active tier grants you <strong>{shopDiscountPercent}% off</strong> all pro shop gear.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Equipment' },
              { id: 'rackets', label: '🎾 Rackets & Bats' },
              { id: 'balls', label: '⚾ Balls' },
              { id: 'apparel', label: '👕 Apparel' },
              { id: 'accessories', label: '🎒 Accessories' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSportsCategory(cat.id)}
                className="btn"
                style={{
                  background: sportsCategory === cat.id ? 'var(--primary)' : 'var(--bg-surface)',
                  color: sportsCategory === cat.id ? 'white' : 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              <strong>Fresh Dining & Bar:</strong> Kitchen orders are routed directly to club kitchen queue with <strong>{barDiscountPercent}% member discount</strong>.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Menu' },
              { id: 'fresh', label: '🥪 Artisan Paninis & Coffee' },
              { id: 'drinks', label: '🥤 Performance Drinks' },
              { id: 'snacks', label: '🍫 Nutrition & Energy Bowls' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCafeCategory(cat.id)}
                className="btn"
                style={{
                  background: cafeCategory === cat.id ? '#f59e0b' : 'var(--bg-surface)',
                  color: cafeCategory === cat.id ? 'white' : 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Global Alerts */}
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

      {/* Content Layout: Product Grid + Order Cart */}
      <div style={{ display: 'grid', gridTemplateColumns: cart.length > 0 ? '1fr 350px' : '1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Products Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {filteredProducts.map(p => {
            const isOutOfStock = p.stock_quantity <= 0;
            const currentQty = getSelectedQuantity(p.id);
            const discountPercent = getProductDiscountPercent(p);
            const finalPrice = getDiscountedPrice(p);
            const isCafe = isCafeItem(p);

            // Icon representation
            let icon = '🎾';
            if (p.category === 'Apparel') icon = '👕';
            else if (p.category === 'Accessories') icon = '🎒';
            else if (p.category === 'Balls') icon = '⚾';
            else if (p.category === 'Café' && p.name.includes('Coffee')) icon = '☕';
            else if (p.category === 'Café' && p.name.includes('Panini')) icon = '🥪';
            else if (p.category === 'Café' && p.name.includes('Bowl')) icon = '🥣';
            else if (p.category === 'Drinks & Nutrition') icon = '🥤';

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: isCafe ? '4px solid #f59e0b' : '4px solid var(--primary)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <div style={{ height: '130px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '3.2rem' }}>{icon}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', color: isCafe ? '#f59e0b' : 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {p.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: isOutOfStock ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
                    {isOutOfStock ? 'Sold Out' : `${p.stock_quantity} left`}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.5rem 0' }}>{p.name}</h3>

                {/* Price and discount badge */}
                <div style={{ marginBottom: '1rem' }}>
                  {discountPercent > 0 ? (
                    <div>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.85rem', marginRight: '0.4rem' }}>
                        ${Number(p.price).toFixed(2)}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                        ${finalPrice}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: '0.15rem' }}>
                        {discountPercent}% member discount applied
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                      ${Number(p.price).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Quantity Controls & Add to Cart */}
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {!isOutOfStock && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quantity:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn"
                          disabled={currentQty <= 1}
                          onClick={() => handleQuantityChange(p.id, -1, p.stock_quantity)}
                          style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{currentQty}</span>
                        <button
                          type="button"
                          className="btn"
                          disabled={currentQty >= p.stock_quantity}
                          onClick={() => handleQuantityChange(p.id, 1, p.stock_quantity)}
                          style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    className="btn btn-primary"
                    disabled={isOutOfStock}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      fontSize: '0.9rem',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      background: isCafe ? '#f59e0b' : 'var(--primary)',
                      border: 'none',
                      fontWeight: 600
                    }}
                    onClick={() => handleAddToCart(p)}
                  >
                    {isOutOfStock ? 'Out of Stock' : isCafe ? 'Add to Café Order' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No products found matching the selected filter.
            </div>
          )}
        </div>

        {/* Order Cart Drawer/Panel */}
        {cart.length > 0 && (
          <div className="card" style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--accent-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Shopping Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</h2>
              <button
                type="button"
                onClick={() => setCart([])}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto' }}>
              {cart.map(item => {
                const isCafe = isCafeItem(item);
                const discountRate = isCafe ? barDiscountPercent : shopDiscountPercent;

                return (
                  <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.6rem', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: isCafe ? '#f59e0b' : 'var(--primary)', fontWeight: 600 }}>
                        {isCafe ? '☕ Café Item' : '🛍️ Sports Gear'} • {discountRate}% off
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ${item.price.toFixed(2)} × {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleUpdateCartQty(item.productId, -1)}
                        style={{ width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="btn"
                        disabled={item.quantity >= item.maxStock}
                        onClick={() => handleUpdateCartQty(item.productId, 1)}
                        style={{ width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.productId)}
                        title="Remove"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '0.3rem', fontSize: '0.9rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Summary */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>

              {cartDiscountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>Tier Discounts:</span>
                  <span>-${cartDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.2rem', marginTop: '0.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                <span>Final Total:</span>
                <span style={{ color: 'var(--primary)' }}>${cartFinalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              className="btn btn-primary"
              disabled={placingOrder || cart.length === 0}
              onClick={handlePlaceOrder}
              style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', fontWeight: 700, marginTop: '0.5rem' }}
            >
              {placingOrder ? 'Processing Order...' : 'Place Order Now'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
