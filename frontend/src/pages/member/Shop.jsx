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
  const [activeCategory, setActiveCategory] = useState('all');

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
        .order('category');
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

  // Helper to get selected quantity for a product card
  const getSelectedQuantity = (productId) => quantities[productId] || 1;

  // Handle changing quantity on product card
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

    // Reset card quantity back to 1
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  // Update quantity directly in cart
  const handleUpdateCartQty = (productId, delta) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.maxStock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  // Remove item from cart
  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Financial Calculations for Cart
  const barDiscountPercent = Number(memberProfile?.membership_plans?.bar_discount || 0);

  const cartSubtotal = Number(
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
  );

  const cartDiscountAmount = Number(
    ((cartSubtotal * (barDiscountPercent / 100))).toFixed(2)
  );

  const cartFinalTotal = Number(
    Math.max(0, cartSubtotal - cartDiscountAmount).toFixed(2)
  );

  // Place Café Order
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
        `Order #${createdOrder.id} placed successfully! Kitchen has received your order.`
      );
      setCart([]);
      // Reload products to display updated stock
      await loadProducts();
    } catch (err) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  // Filter products by active category
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
    <div style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Pro Shop & Café-Bar</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Sports gear, performance drinks, and fresh café orders.</p>
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
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
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

      {/* Main Content Area: Products Grid + Cart Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: cart.length > 0 ? '1fr 340px' : '1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Products Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {filteredProducts.map(p => {
            const isOutOfStock = p.stock_quantity <= 0;
            const currentQty = getSelectedQuantity(p.id);

            // Icon representation by category
            let categoryIcon = '🎾';
            if (p.category === 'Apparel') categoryIcon = '👕';
            else if (p.category === 'Accessories') categoryIcon = '🎒';
            else if (p.category === 'Drinks & Nutrition' || p.category === 'Café' || p.category === 'Bar') categoryIcon = '🥤';

            return (
              <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '130px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

                <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.5rem 0' }}>{p.name}</h3>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                  ${Number(p.price).toFixed(2)}
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
                        <span style={{ fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{currentQty}</span>
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
                    style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.85rem', cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                    onClick={() => handleAddToCart(p)}
                  >
                    {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Display & Checkout */}
        {cart.length > 0 && (
          <div className="card" style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Your Order Cart</h2>
              <button
                type="button"
                onClick={() => setCart([])}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto' }}>
              {cart.map(item => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px dashed var(--border-subtle)' }}>
                  <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.name}</div>
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
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '16px', textAlign: 'center' }}>
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
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '0.25rem', fontSize: '0.9rem' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing Summary */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>

              {barDiscountPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>Bar Discount ({barDiscountPercent}%):</span>
                  <span>-${cartDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.15rem', marginTop: '0.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                <span>Final Total:</span>
                <span style={{ color: 'var(--primary)' }}>${cartFinalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              className="btn btn-primary"
              disabled={placingOrder || cart.length === 0}
              onClick={handlePlaceOrder}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 600, marginTop: '0.5rem' }}
            >
              {placingOrder ? 'Sending to Kitchen...' : 'Place Order'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
