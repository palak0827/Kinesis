import React, { useState, useEffect } from 'react';
import { getProducts, updateProduct, createProduct, getSalesHistory } from '@backend/services/inventoryService.js';
import { getGearRevenueStats } from '@backend/services/revenueService.js';
import { getProductImage } from '../../utils/productImages.js';
import { logAudit } from '../../services/clubPlatformService.js';
import {
  ShoppingBag, Package, AlertTriangle, CheckCircle2, Plus, RefreshCw,
  Search, Edit3, X, DollarSign, Clock, ArrowRight, ShieldAlert
} from 'lucide-react';

export default function ShopManagerPortal({ navigate }) {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'orders' | 'alerts'
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    availableProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    todayOrders: 0,
    todayRevenue: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Edit / Add Modal
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState({
    name: '',
    category: 'Rackets & Bats',
    price: 1500,
    stock_quantity: 10,
    low_stock_threshold: 5
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [allProds, salesData, revStats] = await Promise.all([
        getProducts(),
        getSalesHistory(50),
        getGearRevenueStats()
      ]);

      // Filter only sports gear products
      const gear = (allProds || []).filter(p => {
        const cat = (p.category || '').toLowerCase();
        return !cat.includes('café') && !cat.includes('cafe') && !cat.includes('drink') &&
               !cat.includes('food') && !cat.includes('mocktail') && !cat.includes('snack') && !cat.includes('nutrition');
      });

      setProducts(gear);
      setSales(salesData || []);

      const outCount = gear.filter(p => Number(p.stock_quantity) === 0).length;
      const lowCount = gear.filter(p => Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= Number(p.low_stock_threshold || 5)).length;
      const availCount = gear.filter(p => Number(p.stock_quantity) > 0).length;

      setStats({
        totalProducts: gear.length,
        availableProducts: availCount,
        lowStock: lowCount,
        outOfStock: outCount,
        todayOrders: revStats?.gearSalesCount || 0,
        todayRevenue: revStats?.todayGearRevenue || 0
      });
    } catch (err) {
      console.warn('Failed loading gear shop manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setForm({
      name: '',
      category: 'Rackets & Bats',
      price: 2500,
      stock_quantity: 15,
      low_stock_threshold: 4
    });
    setModalMode('add');
  };

  const openEditModal = (prod) => {
    setSelectedProduct(prod);
    setForm({
      name: prod.name,
      category: prod.category,
      price: prod.price,
      stock_quantity: prod.stock_quantity,
      low_stock_threshold: prod.low_stock_threshold || 5
    });
    setModalMode('edit');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await createProduct(form);
        setFeedback({ type: 'success', text: `Added product: ${form.name}` });
        logAudit({ userName: 'Simran Kaur', role: 'SHOP_MANAGER', action: 'Created Product', entity: 'Gear', entityId: form.name, details: `Added ${form.name} (₹${form.price})` });
      } else if (modalMode === 'edit' && selectedProduct) {
        await updateProduct(selectedProduct.id, form);
        setFeedback({ type: 'success', text: `Updated ${form.name}.` });
        logAudit({ userName: 'Simran Kaur', role: 'SHOP_MANAGER', action: 'Updated Product', entity: 'Gear', entityId: selectedProduct.id, details: `Updated stock/price for ${form.name}` });
      }
      setModalMode(null);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Operation failed.' });
    }
  };

  const handleStockAdjust = async (prodId, delta) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    const newStock = Math.max(0, Number(prod.stock_quantity) + delta);
    try {
      await updateProduct(prodId, { stock_quantity: newStock });
      setFeedback({ type: 'success', text: `Stock adjusted to ${newStock} units.` });
      logAudit({ userName: 'Simran Kaur', role: 'SHOP_MANAGER', action: 'Adjusted Stock', entity: 'Gear', entityId: prodId, details: `${prod.name} stock set to ${newStock}` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed adjusting stock.' });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = !searchTerm.trim() || p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            <ShoppingBag size={16} /> Gear Shop Management Portal
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-main)' }}>Pro Gear Inventory & Orders</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Oversee professional equipment, match rackets, merchandise orders, and low-stock alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={openAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem' }}>
            <Plus size={16} /> Add Product
          </button>
          <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.88rem',
          background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: feedback.type === 'error' ? '#ef4444' : '#10b981',
          border: `1px solid ${feedback.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Available Products</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{stats.availableProducts}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of {stats.totalProducts} Total Items</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Low Stock Alert</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>{stats.lowStock}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Near threshold</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Out of Stock</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>{stats.outOfStock}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock = 0</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Today's Sales Count</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.25rem' }}>{stats.todayOrders}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Units Purchased</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #d4af37' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Gear Revenue</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#b45309', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
            ₹{stats.todayRevenue.toFixed(0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Today's Gear Total</div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('inventory')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'inventory' ? 'var(--primary)' : 'transparent', color: activeTab === 'inventory' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Master Inventory ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('orders')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'orders' ? 'var(--primary)' : 'transparent', color: activeTab === 'orders' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Sales & Order Pickup Log ({sales.length})
        </button>
        <button 
          onClick={() => setActiveTab('alerts')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'alerts' ? 'var(--primary)' : 'transparent', color: activeTab === 'alerts' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Stock Level Alerts ({stats.lowStock + stats.outOfStock})
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: MASTER INVENTORY */}
      {/* ======================================================== */}
      {activeTab === 'inventory' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ width: '220px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              />
              <select 
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value)}
                className="form-input"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              >
                <option value="All">All Categories</option>
                <option value="Rackets & Bats">Rackets & Bats</option>
                <option value="Balls">Balls</option>
                <option value="Apparel">Apparel</option>
                <option value="Accessories">Accessories</option>
                <option value="Bags & Gear">Bags & Gear</option>
                <option value="Other Equipment">Other Equipment</option>
              </select>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Showing {filteredProducts.length} items</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Product</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Price</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Stock</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Threshold</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Availability</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const isOut = Number(p.stock_quantity) === 0;
                  const isLow = !isOut && Number(p.stock_quantity) <= Number(p.low_stock_threshold || 5);

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img 
                          src={getProductImage(p)} 
                          alt={p.name} 
                          style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'contain', background: 'var(--bg-main)' }} 
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{p.id}</div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{p.category}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        ₹{Number(p.price).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button onClick={() => handleStockAdjust(p.id, -1)} style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', cursor: 'pointer' }}>-</button>
                          <span>{p.stock_quantity}</span>
                          <button onClick={() => handleStockAdjust(p.id, 1)} style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', cursor: 'pointer' }}>+</button>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{p.low_stock_threshold || 5} Units</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {isOut ? (
                          <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            OUT OF STOCK
                          </span>
                        ) : isLow ? (
                          <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            LOW STOCK
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            AVAILABLE
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => openEditModal(p)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                        >
                          <Edit3 size={13} style={{ marginRight: '4px' }} /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: SALES & ORDER PICKUP LOG */}
      {/* ======================================================== */}
      {activeTab === 'orders' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem' }}>Sports Gear Sales & Orders Log</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Sale ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Purchaser</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Product</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Quantity</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Effective Price</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Total</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Date & Time</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      #SALE-{String(s.id).padStart(4, '0')}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{s.members?.name || 'Walk-in Counter Guest'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.members?.club_id ? `Club ID: ${s.members.club_id} • ` : ''}{s.members?.email || 'Store POS'}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{s.products?.name || 'Sports Item'}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{s.quantity}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)' }}>₹{Number(s.unit_price).toFixed(2)}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>₹{Number(s.total).toFixed(2)}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(s.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                        COMPLETED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: STOCK LEVEL ALERTS */}
      {/* ======================================================== */}
      {activeTab === 'alerts' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', color: '#ef4444' }}>Low & Depleted Stock Warnings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {products.filter(p => Number(p.stock_quantity) <= Number(p.low_stock_threshold || 5)).map(p => {
              const isOut = Number(p.stock_quantity) === 0;
              return (
                <div key={p.id} className="card" style={{ padding: '1.25rem', borderLeft: isOut ? '4px solid #ef4444' : '4px solid #f59e0b', background: 'var(--bg-main)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>{p.name}</h4>
                    <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 800, background: isOut ? '#ef4444' : '#f59e0b', color: '#fff' }}>
                      {isOut ? 'OUT OF STOCK' : 'LOW STOCK'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Current Count: <strong>{p.stock_quantity} Units</strong> (Threshold: {p.low_stock_threshold || 5})
                  </div>
                  <button onClick={() => handleStockAdjust(p.id, 20)} className="btn btn-primary" style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem' }}>
                    Replenish Stock (+20)
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>{modalMode === 'add' ? 'Add New Gear Product' : `Edit ${form.name}`}</h3>
              <button onClick={() => setModalMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Product Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Wilson Blade 98 V8"
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Category</label>
                  <select 
                    value={form.category} 
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="Rackets & Bats">Rackets & Bats</option>
                    <option value="Balls">Balls</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Bags & Gear">Bags & Gear</option>
                    <option value="Other Equipment">Other Equipment</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Retail Price (₹)</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={form.price} 
                    onChange={e => setForm({ ...form, price: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Stock Quantity</label>
                  <input 
                    type="number" 
                    min="0"
                    value={form.stock_quantity} 
                    onChange={e => setForm({ ...form, stock_quantity: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Low Stock Alert Threshold</label>
                  <input 
                    type="number" 
                    min="1"
                    value={form.low_stock_threshold} 
                    onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModalMode(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{modalMode === 'add' ? 'Create Product' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
