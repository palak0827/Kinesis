import React, { useState, useEffect } from 'react';
import { getCafeTables, updateTableStatus } from '@backend/services/cafeTableService.js';
import { getKitchenOrders, updateOrderStatus } from '@backend/services/cafeService.js';
import { getProducts, updateProduct, createProduct } from '@backend/services/inventoryService.js';
import { getTodayRevenueBreakdown } from '@backend/services/revenueService.js';
import { getProductImage } from '../../utils/productImages.js';
import { logAudit } from '../../services/clubPlatformService.js';
import ReceiptModal from '../../components/ReceiptModal.jsx';
import {
  Wine, Coffee, GlassWater, Package, Plus, RefreshCw, CheckCircle2,
  AlertTriangle, DollarSign, Clock, Search, X, Edit3, Eye, Printer
} from 'lucide-react';

export default function BarPortal({ navigate }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'inventory' | 'orders' | 'seating'
  const [beverages, setBeverages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [kpis, setKpis] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    activeOrders: 0,
    preparing: 0,
    ready: 0,
    availableTables: 0,
    occupiedTables: 0,
    outOfStockCount: 0,
    lowStockCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Operational Order Table & Modal States
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [transitioningOrderId, setTransitioningOrderId] = useState(null);

  // New Beverage Modal
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    category: 'Mocktails',
    price: 180,
    stock_quantity: 30,
    low_stock_threshold: 5
  });

  const loadBarData = async () => {
    setLoading(true);
    try {
      const [productsData, ordersData, tablesData, revData] = await Promise.all([
        getProducts(),
        getKitchenOrders(),
        getCafeTables(),
        getTodayRevenueBreakdown()
      ]);

      // Filter products to Bar & Beverages
      const barProducts = (productsData || []).filter(p => {
        const cat = (p.category || '').toLowerCase();
        return (
          cat.includes('drink') || cat.includes('mocktail') || cat.includes('coffee') ||
          cat.includes('beverage') || cat.includes('bar') || cat.includes('nutrition') || cat.includes('café')
        );
      });
      setBeverages(barProducts);

      // Filter orders relevant to Bar (drinks, beverages, mocktails)
      const barOrders = (ordersData || []).filter(o => {
        const items = o.cafe_order_items || o.items || [];
        if (items.length === 0) return true;
        return items.some(it => {
          const cat = (it.products?.category || it.category || it.products?.name || it.name || '').toLowerCase();
          return cat.includes('drink') || cat.includes('mocktail') || cat.includes('coffee') ||
                 cat.includes('beverage') || cat.includes('bar') || cat.includes('nutrition') ||
                 cat.includes('shake') || cat.includes('cooler') || cat.includes('tea');
        });
      });
      setOrders(barOrders);
      setTables(tablesData || []);

      const outOfStock = barProducts.filter(p => Number(p.stock_quantity) === 0).length;
      const lowStock = barProducts.filter(p => Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= Number(p.low_stock_threshold || 5)).length;
      const prep = barOrders.filter(o => o.status === 'PREPARING').length;
      const rdy = barOrders.filter(o => o.status === 'READY').length;
      const active = barOrders.filter(o => o.status === 'NEW' || o.status === 'PREPARING' || o.status === 'READY').length;

      const availTables = (tablesData || []).filter(t => t.status === 'AVAILABLE').length;
      const occTables = (tablesData || []).filter(t => t.status === 'OCCUPIED').length;

      setKpis({
        todayRevenue: revData?.cafeRevenue || 0,
        todayOrders: barOrders.length,
        activeOrders: active,
        preparing: prep,
        ready: rdy,
        availableTables: availTables,
        occupiedTables: occTables,
        outOfStockCount: outOfStock,
        lowStockCount: lowStock
      });
    } catch (err) {
      console.warn('Failed loading bar portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarData();
  }, []);

  const handleStockToggle = async (productId, currentStock) => {
    try {
      const newQty = currentStock > 0 ? 0 : 25;
      await updateProduct(productId, { stock_quantity: newQty });
      setFeedback({ type: 'success', text: newQty === 0 ? 'Item marked Out of Stock.' : 'Stock restored to 25 units.' });
      logAudit({ userName: 'Arun Nair', role: 'BAR_MANAGER', action: 'Stock Level Changed', entity: 'Bar Item', entityId: productId, details: `Stock set to ${newQty}` });
      await loadBarData();
    } catch (e) {
      setFeedback({ type: 'error', text: e.message || 'Failed updating stock.' });
    }
  };

  const handleOrderStatus = async (orderId, newStatus) => {
    if (transitioningOrderId) return;
    setTransitioningOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      setFeedback({ type: 'success', text: `Bar order #${orderId} moved to ${newStatus}.` });
      logAudit({ userName: 'Arun Nair', role: 'BAR_MANAGER', action: 'Order Status Update', entity: 'Bar Order', entityId: orderId, details: `Moved to ${newStatus}` });
      await loadBarData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (e) {
      setFeedback({ type: 'error', text: e.message || 'Status transition error.' });
    } finally {
      setTransitioningOrderId(null);
    }
  };

  const handleCreateBeverage = async (e) => {
    e.preventDefault();
    try {
      await createProduct(newItemForm);
      setFeedback({ type: 'success', text: `Added new bar item: ${newItemForm.name}.` });
      logAudit({ userName: 'Arun Nair', role: 'BAR_MANAGER', action: 'Created Bar Item', entity: 'Product', entityId: newItemForm.name, details: `Created ${newItemForm.name} (₹${newItemForm.price})` });
      setAddItemModalOpen(false);
      setNewItemForm({ name: '', category: 'Mocktails', price: 180, stock_quantity: 30, low_stock_threshold: 5 });
      await loadBarData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed adding beverage.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#d97706', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            <Wine size={16} /> Bar Operations & Cellar Portal
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-main)' }}>Bar Lounge & Beverage Manager</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage artisan mocktails, performance hydration drinks, bar orders queue, and cellar inventory.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setAddItemModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem' }}>
            <Plus size={16} /> Add Beverage Item
          </button>
          <button onClick={loadBarData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
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

      {/* KPIs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #d97706' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Bar Revenue</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#d97706', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
            ₹{kpis.todayRevenue.toFixed(0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Today's Beverage Total</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Bar Orders</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.25rem' }}>{kpis.todayOrders}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{kpis.activeOrders} active tickets</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Preparing</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>{kpis.preparing}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>At Bar Counter</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Ready to Serve</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{kpis.ready}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Plated / Poured</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Out of Stock</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>{kpis.outOfStockCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{kpis.lowStockCount} Low stock alerts</div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'dashboard' ? 'var(--primary)' : 'transparent', color: activeTab === 'dashboard' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Bar Order Queue ({orders.length})
        </button>
        <button 
          onClick={() => setActiveTab('inventory')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'inventory' ? 'var(--primary)' : 'transparent', color: activeTab === 'inventory' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Beverage & Cellar Stock ({beverages.length})
        </button>
        <button 
          onClick={() => setActiveTab('seating')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'seating' ? 'var(--primary)' : 'transparent', color: activeTab === 'seating' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Lounge & High-Top Seating
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: COMPACT OPERATIONAL BAR ORDER TABLE */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Bar Tickets & Drink Service Queue</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Compact operational log. Click any row or 'View' for ticket recipe & billing details.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search order, customer, Club ID..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '28px', fontSize: '0.82rem', width: '220px' }}
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.82rem' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">NEW</option>
                <option value="PREPARING">PREPARING</option>
                <option value="READY">READY</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {(() => {
            const filtered = orders.filter(o => {
              const q = orderSearch.toLowerCase().trim();
              const matchesSearch = !q ||
                String(o.id).includes(q) ||
                (o.members?.name && o.members.name.toLowerCase().includes(q)) ||
                (o.members?.club_id && String(o.members.club_id).includes(q));
              const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
              return matchesSearch && matchesStatus;
            });

            if (filtered.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                  <Wine size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.35, display: 'block' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No bar orders found.</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem' }}>No tickets match your search or filter criteria.</p>
                </div>
              );
            }

            return (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Order</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Customer</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Club ID</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Items</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Amount</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Payment</th>
                      <th style={{ padding: '0.7rem 0.5rem' }}>Status</th>
                      <th style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(o => {
                      const itemCount = (o.cafe_order_items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
                      const paymentMethod = o.payment_method || 'CARD';
                      const clubId = o.members?.club_id || 'Walk-In';
                      const isTransitioning = transitioningOrderId === o.id;

                      return (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '0.7rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                            #BAR-{String(o.id).padStart(4, '0')}
                          </td>
                          <td style={{ padding: '0.7rem 0.5rem' }}>
                            <div style={{ fontWeight: 600 }}>{o.members?.name || 'Walk-in Guest'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td style={{ padding: '0.7rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                            {clubId}
                          </td>
                          <td style={{ padding: '0.7rem 0.5rem' }}>
                            <span style={{ background: 'var(--bg-main)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                              {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                            </span>
                          </td>
                          <td style={{ padding: '0.7rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                            ₹{Number(o.total).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.7rem 0.5rem' }}>
                            <span style={{ fontSize: '0.74rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', fontWeight: 700 }}>
                              {paymentMethod}
                            </span>
                          </td>
                          <td style={{ padding: '0.7rem 0.5rem' }}>
                            <span style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '999px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: o.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : o.status === 'PREPARING' ? 'rgba(245, 158, 11, 0.15)' : o.status === 'READY' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                              color: o.status === 'COMPLETED' ? '#10b981' : o.status === 'PREPARING' ? '#f59e0b' : o.status === 'READY' ? '#3b82f6' : '#64748b'
                            }}>
                              {o.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                              {o.status === 'NEW' && (
                                <button
                                  disabled={isTransitioning}
                                  onClick={() => handleOrderStatus(o.id, 'PREPARING')}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem' }}
                                >
                                  {isTransitioning ? 'Updating...' : 'Start Pouring'}
                                </button>
                              )}
                              {o.status === 'PREPARING' && (
                                <button
                                  disabled={isTransitioning}
                                  onClick={() => handleOrderStatus(o.id, 'READY')}
                                  className="btn btn-primary"
                                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', background: '#3b82f6' }}
                                >
                                  {isTransitioning ? 'Updating...' : 'Ready'}
                                </button>
                              )}
                              {o.status === 'READY' && (
                                <button
                                  disabled={isTransitioning}
                                  onClick={() => handleOrderStatus(o.id, 'COMPLETED')}
                                  className="btn btn-primary"
                                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', background: '#10b981' }}
                                >
                                  {isTransitioning ? 'Updating...' : 'Complete'}
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedOrder(o)}
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Eye size={12} /> View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: BEVERAGE & CELLAR INVENTORY */}
      {/* ======================================================== */}
      {activeTab === 'inventory' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Bar & Beverage Master Inventory</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{beverages.length} items cataloged</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Beverage</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Price</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Bottles / Stock</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Availability</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {beverages.map(b => {
                  const isOut = Number(b.stock_quantity) === 0;
                  const isLow = !isOut && Number(b.stock_quantity) <= Number(b.low_stock_threshold || 5);
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img 
                          src={getProductImage(b)} 
                          alt={b.name} 
                          style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} 
                        />
                        <span style={{ fontWeight: 600 }}>{b.name}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{b.category}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)' }}>₹{Number(b.price).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>{b.stock_quantity} Units</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {isOut ? (
                          <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            OUT OF STOCK
                          </span>
                        ) : isLow ? (
                          <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            LOW STOCK ({b.stock_quantity})
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            IN CELLAR
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleStockToggle(b.id, b.stock_quantity)}
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          {isOut ? 'Restore Stock (25)' : 'Mark Out of Stock'}
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
      {/* VIEW 3: LOUNGE & HIGH-TOP SEATING */}
      {/* ======================================================== */}
      {activeTab === 'seating' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {tables.map(t => (
            <div key={t.id} className="card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0 }}>{t.table_number}</h4>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: t.status === 'OCCUPIED' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: t.status === 'OCCUPIED' ? '#f59e0b' : '#10b981' }}>
                  {t.status}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Bar Lounge Seating • Capacity: {t.capacity}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {t.status === 'AVAILABLE' ? (
                  <button onClick={() => updateTableStatus(t.id, 'OCCUPIED').then(loadBarData)} className="btn btn-primary" style={{ width: '100%', padding: '0.4rem', fontSize: '0.78rem' }}>
                    Seat at Bar
                  </button>
                ) : (
                  <button onClick={() => updateTableStatus(t.id, 'AVAILABLE').then(loadBarData)} className="btn btn-secondary" style={{ width: '100%', padding: '0.4rem', fontSize: '0.78rem' }}>
                    Release Bar Seat
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Beverage Modal */}
      {addItemModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>Add New Bar / Beverage Item</h3>
              <button onClick={() => setAddItemModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateBeverage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Beverage Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Passionfruit Mojito Cooler"
                  value={newItemForm.name} 
                  onChange={e => setNewItemForm({ ...newItemForm, name: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Category</label>
                  <select 
                    value={newItemForm.category} 
                    onChange={e => setNewItemForm({ ...newItemForm, category: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="Mocktails">Mocktails</option>
                    <option value="Soft Drinks">Soft Drinks</option>
                    <option value="Coffee">Coffee</option>
                    <option value="Cold Drinks">Cold Drinks</option>
                    <option value="Energy Drinks">Energy Drinks</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Price (₹)</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={newItemForm.price} 
                    onChange={e => setNewItemForm({ ...newItemForm, price: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Initial Stock</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newItemForm.stock_quantity} 
                    onChange={e => setNewItemForm({ ...newItemForm, stock_quantity: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Low Stock Alert</label>
                  <input 
                    type="number" 
                    min="1"
                    value={newItemForm.low_stock_threshold} 
                    onChange={e => setNewItemForm({ ...newItemForm, low_stock_threshold: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setAddItemModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ORDER DETAILS MODAL */}
      {/* ======================================================== */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Bar Ticket Details</span>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.4rem' }}>#BAR-{String(selectedOrder.id).padStart(4, '0')}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Customer</span>
                <strong>{selectedOrder.members?.name || 'Walk-in Table Guest'}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Club ID</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedOrder.members?.club_id || 'Walk-In'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Payment Method</span>
                <strong style={{ color: 'var(--primary)' }}>{selectedOrder.payment_method || 'CARD'}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Current Status</span>
                <strong style={{ color: '#d97706' }}>{selectedOrder.status}</strong>
              </div>
            </div>

            {/* Line Items */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Drink Recipe</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.cafe_order_items || []).map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>{it.products?.name || 'Beverage Item'}</td>
                      <td style={{ padding: '0.55rem', textAlign: 'center' }}>{it.quantity}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        ₹{Number(it.total || (it.unit_price * it.quantity)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontWeight: 800, fontSize: '1.1rem' }}>
              <span>Total Bill:</span>
              <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>₹{Number(selectedOrder.total).toFixed(2)}</span>
            </div>

            {/* Status Transition Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {selectedOrder.status === 'NEW' && (
                <button
                  disabled={transitioningOrderId === selectedOrder.id}
                  onClick={() => handleOrderStatus(selectedOrder.id, 'PREPARING')}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', background: '#d97706' }}
                >
                  {transitioningOrderId === selectedOrder.id ? 'Updating...' : 'Start Pouring'}
                </button>
              )}
              {selectedOrder.status === 'PREPARING' && (
                <button
                  disabled={transitioningOrderId === selectedOrder.id}
                  onClick={() => handleOrderStatus(selectedOrder.id, 'READY')}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', background: '#3b82f6' }}
                >
                  {transitioningOrderId === selectedOrder.id ? 'Updating...' : 'Mark Ready'}
                </button>
              )}
              {selectedOrder.status === 'READY' && (
                <button
                  disabled={transitioningOrderId === selectedOrder.id}
                  onClick={() => handleOrderStatus(selectedOrder.id, 'COMPLETED')}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', background: '#10b981' }}
                >
                  {transitioningOrderId === selectedOrder.id ? 'Updating...' : 'Confirm Served'}
                </button>
              )}
            </div>

            {/* Print Receipt Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setReceiptOrder({
                    id: selectedOrder.id,
                    receiptNumber: `#KSC-BAR-${String(selectedOrder.id).padStart(4, '0')}`,
                    customerName: selectedOrder.members?.name || 'Bar Lounge Guest',
                    club_id: selectedOrder.members?.club_id || 'Walk-In',
                    customerType: selectedOrder.members?.user_type === 'MEMBER' ? 'MEMBER' : 'WALK-IN',
                    created_at: selectedOrder.created_at,
                    subtotal: selectedOrder.subtotal || selectedOrder.total,
                    discount_amount: selectedOrder.discount_amount || 0,
                    total: selectedOrder.total,
                    payment_method: selectedOrder.payment_method || 'CARD',
                    payment_status: 'PAID',
                    items: (selectedOrder.cafe_order_items || []).map(it => ({
                      name: it.products?.name || 'Drink',
                      quantity: it.quantity,
                      unitPrice: it.unit_price,
                      total: it.total
                    }))
                  });
                }}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Printer size={15} /> Print Receipt
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal
          receiptType="CAFE_BAR"
          data={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}

    </div>
  );
}
