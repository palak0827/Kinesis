import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { useAuth } from '../../AuthContext.jsx';
import { createCafeOrder } from '@backend/services/cafeService.js';
import { recordPayment } from '@backend/services/paymentService.js';
import { getProductImage } from '../../utils/productImages.js';
import { getUserPricingContext } from '../../utils/pricingEngine.js';
import UnifiedPaymentModal from '../../components/UnifiedPaymentModal.jsx';
import ReceiptModal from '../../components/ReceiptModal.jsx';
import { ShoppingBag, Coffee, Sparkles } from 'lucide-react';

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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState(null);

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

  // Helper to determine if a product belongs to the Café & Bar
  const isCafeItem = (p) => {
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    return (
      cat.includes('drink') ||
      cat.includes('café') ||
      cat.includes('cafe') ||
      cat.includes('bar') ||
      cat.includes('food') ||
      cat.includes('nutrition') ||
      cat.includes('snack') ||
      name.includes('espresso') ||
      name.includes('americano') ||
      name.includes('latte') ||
      name.includes('brew') ||
      name.includes('smoothie') ||
      name.includes('rush') ||
      name.includes('shake') ||
      name.includes('fizz') ||
      name.includes('smash') ||
      name.includes('spark') ||
      name.includes('cooler') ||
      name.includes('panini') ||
      name.includes('wrap') ||
      name.includes('bowl') ||
      name.includes('bites')
    );
  };

  // Pricing context adhering to active vs expired vs walk-in rules
  const pricingCtx = getUserPricingContext(memberProfile);
  const shopDiscountPercent = pricingCtx.shopDiscountPercent;
  const barDiscountPercent = pricingCtx.barDiscountPercent;

  // Quantity controls on product card
  const getSelectedQuantity = (productId) => quantities[productId] || 1;

  const handleQuantityChange = (productId, delta, maxStock) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(maxStock, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  // Add product to cart
  const handleAddToCart = (product) => {
    if (product.availability_status === 'TEMPORARILY_UNAVAILABLE' || product.stock_quantity <= 0) {
      return;
    }

    const qtyToAdd = getSelectedQuantity(product.id);

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.productId === product.id);
      if (existing) {
        const updatedQty = Math.min(product.stock_quantity, existing.quantity + qtyToAdd);
        return prevCart.map((item) =>
          item.productId === product.id ? { ...item, quantity: updatedQty } : item
        );
      } else {
        return [
          ...prevCart,
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

    setSuccessMessage(`Added ${qtyToAdd} × "${product.name}" to cart.`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleUpdateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const next = item.quantity + delta;
            return next > 0 && next <= item.maxStock ? { ...item, quantity: next } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Cart Calculations with Strict Category Discount Separation
  const cartSubtotal = Number(
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
  );

  // Each item gets ONLY its corresponding discount:
  // Sports gear -> shop_discount (0% if walk-in or expired)
  // Cafe food/drinks -> bar_discount (0% if walk-in or expired)
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

  // Open Unified Payment Modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setError(null);
    setIsPaymentModalOpen(true);
  };

  // Place Order with Selected Payment Method (Cash, Card, UPI)
  const handleConfirmOrder = async ({ paymentMethod, paymentStatus, paymentDetails }) => {
    if (placingOrder || cart.length === 0) return;

    setError(null);
    setSuccessMessage(null);
    setPlacingOrder(true);

    try {
      const itemsToOrder = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      // 1. Create order in cafe_orders & deduct stock
      const createdOrder = await createCafeOrder({
        memberId: memberProfile?.id || null,
        items: itemsToOrder
      });

      // 2. Audit record in payments table
      await recordPayment({
        memberId: memberProfile?.id || null,
        referenceType: shopSection === 'sports' ? 'GEAR_ORDER' : 'CAFE_ORDER',
        referenceId: createdOrder.id,
        amount: cartFinalTotal,
        paymentMethod,
        paymentStatus,
        paymentDetails
      });

      // 3. Prepare completed receipt for customer
      setCompletedReceipt({
        id: createdOrder.id,
        receiptNumber: `#KSC-ORD-${String(createdOrder.id).padStart(4, '0')}`,
        customerName: memberProfile?.name || 'Walk-In Guest',
        club_id: memberProfile?.club_id || 'N/A',
        customerType: memberProfile?.user_type || (memberProfile?.plan_id ? 'MEMBER' : 'WALK-IN'),
        created_at: new Date().toISOString(),
        subtotal: cartSubtotal,
        discount_amount: cartDiscountAmount,
        total: cartFinalTotal,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        status: createdOrder.status || 'NEW',
        items: cart.map((c) => ({
          name: c.name,
          quantity: c.quantity,
          unitPrice: c.price,
          total: c.price * c.quantity
        }))
      });

      setSuccessMessage(
        paymentMethod === 'CASH'
          ? `Order #${createdOrder.id} placed! Please pay ₹${cartFinalTotal.toFixed(2)} at the counter.`
          : `Order #${createdOrder.id} confirmed! Payment received via ${paymentMethod}.`
      );

      setCart([]);
      setIsPaymentModalOpen(false);
      await loadProducts();
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.');
      // Refresh current stock on concurrency error so stale items update immediately
      await loadProducts();
    } finally {
      setPlacingOrder(false);
    }
  };

  // Filter products based on active top-level shopping mode and subcategory
  const filteredProducts = products.filter((p) => {
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
      const cat = (p.category || '').toLowerCase();
      const nm = (p.name || '').toLowerCase();

      if (cafeCategory === 'food') {
        return cat.includes('food') || nm.includes('panini') || nm.includes('wrap') ||
          nm.includes('pasta') || nm.includes('bowl') || nm.includes('melt');
      }
      if (cafeCategory === 'coffee') {
        return nm.includes('coffee') || nm.includes('brew') || nm.includes('espresso') || nm.includes('latte') || nm.includes('americano') || nm.includes('cappuccino');
      }
      if (cafeCategory === 'mocktails') {
        return cat.includes('mocktail') || nm.includes('mojito') || nm.includes('blue lagoon') ||
          nm.includes('fizz') || nm.includes('punch') || nm.includes('watermelon') ||
          nm.includes('smash') || nm.includes('spark') || nm.includes('lime');
      }
      if (cafeCategory === 'cold_drinks') {
        return (cat.includes('drink') || nm.includes('cooler') || nm.includes('water') || nm.includes('soda') || nm.includes('juice') || nm.includes('shake') || nm.includes('smoothie')) && !nm.includes('espresso') && !nm.includes('latte') && !nm.includes('coffee');
      }
      if (cafeCategory === 'snacks') {
        return cat.includes('snack') || cat.includes('nutrition') ||
          nm.includes('fries') || nm.includes('sandwich') || nm.includes('nachos') ||
          nm.includes('bar') || nm.includes('bites') || nm.includes('cup');
      }
      if (cafeCategory === 'other') {
        return true;
      }
      return true;
    }
  });

  if (loading) return <div style={{ padding: '2rem' }}>Loading club shop & café...</div>;

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.4rem' }}>Club Gear & Dining</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Official sports equipment, performance apparel, handcrafted mocktails, and fresh kitchen dining.
          </p>
        </div>

        {pricingCtx.isActiveMember && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--bg-surface)', padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              Gear Discount: <strong style={{ color: 'var(--primary)' }}>{shopDiscountPercent}%</strong>
            </span>
            <span style={{ background: 'var(--bg-surface)', padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              Café Discount: <strong style={{ color: '#f59e0b' }}>{barDiscountPercent}%</strong>
            </span>
          </div>
        )}
      </div>

      {/* Top Department Switcher */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          className="btn"
          onClick={() => {
            setShopSection('sports');
            setSportsCategory('all');
          }}
          style={{
            background: shopSection === 'sports' ? 'var(--primary)' : 'transparent',
            color: shopSection === 'sports' ? 'white' : 'var(--text-main)',
            border: 'none',
            fontSize: '1.05rem',
            fontWeight: 700,
            padding: '0.65rem 1.4rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ShoppingBag size={18} />
          <span>Gear Shop</span>
        </button>

        <button
          className="btn"
          onClick={() => {
            setShopSection('cafe');
            setCafeCategory('all');
          }}
          style={{
            background: shopSection === 'cafe' ? '#f59e0b' : 'transparent',
            color: shopSection === 'cafe' ? 'white' : 'var(--text-main)',
            border: 'none',
            fontSize: '1.05rem',
            fontWeight: 700,
            padding: '0.65rem 1.4rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Coffee size={18} />
          <span>Café & Bar</span>
        </button>
      </div>

      {/* Subcategory Filters (Section 12 & 13) */}
      {shopSection === 'sports' ? (
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Equipment' },
            { id: 'rackets', label: '🎾 Rackets & Bats' },
            { id: 'balls', label: '🥎 Match Balls' },
            { id: 'apparel', label: '👕 Apparel & Wear' },
            { id: 'accessories', label: '🎒 Bags & Gear' }
          ].map((cat) => (
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
      ) : (
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Menu' },
            { id: 'food', label: '🥪 Food' },
            { id: 'coffee', label: '☕ Coffee' },
            { id: 'mocktails', label: '🍸 Mocktails' },
            { id: 'cold_drinks', label: '🥤 Cold Drinks' },
            { id: 'snacks', label: '🍟 Snacks' },
            { id: 'other', label: '🥗 Other' }
          ].map((cat) => (
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
        {/* Products Grid - Prioritizing IMAGE -> Name -> Category -> Price -> Stock -> Action */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {filteredProducts.map((p) => {
            const isOutOfStock = p.stock_quantity <= 0 || p.availability_status === 'OUT_OF_STOCK';
            const isTempUnavail = p.availability_status === 'TEMPORARILY_UNAVAILABLE';
            const cannotBuy = isOutOfStock || isTempUnavail;
            const currentQty = getSelectedQuantity(p.id);
            const isCafe = isCafeItem(p);

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  borderTop: isCafe ? '4px solid #f59e0b' : '4px solid var(--primary)',
                  padding: '1.25rem'
                }}
              >
                {/* 1. IMAGE: Object-fit contain, consistent dimensions, never stretched */}
                <div
                  style={{
                    height: '200px',
                    width: '100%',
                    overflow: 'hidden',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  <img
                    src={getProductImage(p)}
                    alt={p.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                    loading="lazy"
                  />
                </div>

                {/* 2. Product Name */}
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.4rem 0', color: 'var(--text-main)', lineHeight: 1.3 }}>
                  {p.name}
                </h3>

                {/* 3. Category & Stock Availability Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: isCafe ? '#b45309' : 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {p.category}
                  </span>

                  {isTempUnavail ? (
                    <span style={{ fontSize: '0.72rem', color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Temporarily Unavailable
                    </span>
                  ) : isOutOfStock ? (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Out of Stock
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {p.stock_quantity} in stock
                    </span>
                  )}
                </div>

                {/* 4. Price: Strong numeric typography */}
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    ₹{Number(p.price).toFixed(2)}
                  </span>
                </div>

                {/* 5. Action: Quantity & Add to Cart */}
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {!cannotBuy && (
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
                    disabled={cannotBuy}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      fontSize: '0.9rem',
                      cursor: cannotBuy ? 'not-allowed' : 'pointer',
                      background: cannotBuy ? 'var(--border-subtle)' : isCafe ? '#f59e0b' : 'var(--primary)',
                      color: cannotBuy ? 'var(--text-muted)' : 'white',
                      border: 'none',
                      fontWeight: 700
                    }}
                    onClick={() => handleAddToCart(p)}
                  >
                    {isTempUnavail ? 'Temporarily Unavailable' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* PHASE 13: Order Cart & Checkout Summary */}
        {cart.length > 0 && (
          <div
            className="card"
            style={{
              position: 'sticky',
              top: '2rem',
              padding: '1.5rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Your Cart ({cart.length})</h3>
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
              {cart.map((item) => (
                <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.6rem', borderBottom: '1px dashed var(--border-subtle)' }}>
                  {/* Cart Item Thumbnail */}
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      minWidth: '46px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxSizing: 'border-box'
                    }}
                  >
                    <img
                      src={getProductImage(item)}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, paddingRight: '0.25rem' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ₹{item.price.toFixed(2)} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
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
              ))}
            </div>

            {/* Financial Summary */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>₹{cartSubtotal.toFixed(2)}</span>
              </div>

              {cartDiscountAmount > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                  <span>{pricingCtx.planName} {shopSection === 'cafe' ? 'Café Discount' : 'Gear Discount'} ({shopSection === 'cafe' ? barDiscountPercent : shopDiscountPercent}%):</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>-₹{cartDiscountAmount.toFixed(2)}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <span>Membership Discount:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>₹0.00</span>
                </div>
              )}

              {pricingCtx.isWalkIn && (
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', lineHeight: 1.4, margin: '0.2rem 0' }}>
                  💡 Members save up to 20% on Gear and 15% on Café dining.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.25rem', marginTop: '0.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                <span>Total Payable:</span>
                <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>₹{cartFinalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Payment Button */}
            <button
              className="btn btn-primary"
              disabled={placingOrder || cart.length === 0}
              onClick={handleOpenCheckout}
              style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', fontWeight: 700, marginTop: '0.75rem' }}
            >
              Continue to Payment
            </button>
          </div>
        )}
      </div>

      {/* UNIFIED CHECKOUT PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <UnifiedPaymentModal
          amount={cartFinalTotal}
          title="Complete Your Order"
          subtitle={`Cart contains ${cart.length} item(s) • Total ₹${cartFinalTotal.toFixed(2)}`}
          loading={placingOrder}
          onConfirm={handleConfirmOrder}
          onCancel={() => setIsPaymentModalOpen(false)}
        />
      )}

      {/* COMPLETED RECEIPT MODAL */}
      {completedReceipt && (
        <ReceiptModal
          receiptType={shopSection === 'sports' ? 'GEAR_SHOP' : 'CAFE_BAR'}
          data={completedReceipt}
          onClose={() => setCompletedReceipt(null)}
        />
      )}
    </div>
  );
}
