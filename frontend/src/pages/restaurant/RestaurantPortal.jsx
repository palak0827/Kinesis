import React, { useState, useEffect } from 'react';
import { getCafeTables, updateTableStatus, calculateTableSummary } from '@backend/services/cafeTableService.js';
import { getKitchenOrders, updateOrderStatus, isCafeProduct } from '@backend/services/cafeService.js';
import { getProducts, updateProduct } from '@backend/services/inventoryService.js';
import { getTodayRevenueBreakdown } from '@backend/services/revenueService.js';
import { logAudit } from '../../services/clubPlatformService.js';
import ReceiptModal from '../../components/ReceiptModal.jsx';
import {
  Utensils, LayoutGrid, ClipboardList, ChefHat, Package, CheckCircle2,
  Clock, AlertTriangle, Plus, RefreshCw, ArrowRight, User, DollarSign, X,
  Search, Eye, Printer
} from 'lucide-react';

export default function RestaurantPortal({ navigate }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'tables' | 'orders' | 'kitchen' | 'inventory'
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [kpis, setKpis] = useState({
    totalTables: 0,
    availableTables: 0,
    reservedTables: 0,
    occupiedTables: 0,
    maintenanceTables: 0,
    todayOrders: 0,
    preparingOrders: 0,
    completedOrders: 0,
    todayRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Operational Order Table & Modal States
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [transitioningOrderId, setTransitioningOrderId] = useState(null);

  // Reservation / Status modal state
  const [selectedTable, setSelectedTable] = useState(null);
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [reserveForm, setReserveForm] = useState({ customer: '', partySize: 2, time: '19:30', notes: '' });

  // Add Table modal
  const [addTableModalOpen, setAddTableModalOpen] = useState(false);
  const [newTableForm, setNewTableForm] = useState({ table_number: '', table_name: '', capacity: 4 });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tablesData, ordersData, productsData, revData] = await Promise.all([
        getCafeTables(),
        getKitchenOrders(),
        getProducts(),
        getTodayRevenueBreakdown()
      ]);

      setTables(tablesData || []);

      // Filter orders relevant to Restaurant & Kitchen (food, meals, snacks, bowls, sandwiches)
      const restaurantOrders = (ordersData || []).filter(o => {
        const items = o.cafe_order_items || o.items || [];
        if (items.length === 0) return true;
        return items.some(it => {
          const cat = (it.products?.category || it.category || it.products?.name || it.name || '').toLowerCase();
          return cat.includes('food') || cat.includes('snack') || cat.includes('panini') ||
                 cat.includes('wrap') || cat.includes('sandwich') || cat.includes('bowl') ||
                 cat.includes('salad') || cat.includes('pasta') || cat.includes('pizza') ||
                 cat.includes('meal') || cat.includes('kitchen') || cat.includes('dining') ||
                 cat.includes('dish') || cat.includes('café');
        });
      });
      setOrders(restaurantOrders);

      const foods = (productsData || []).filter(p => {
        const cat = (p.category || '').toLowerCase();
        return cat.includes('food') || cat.includes('snack') || cat.includes('panini') || cat.includes('wrap') || cat.includes('bowl') || cat.includes('café');
      });
      setFoodItems(foods);

      const tableSummary = calculateTableSummary(tablesData || []);
      const prep = restaurantOrders.filter(o => o.status === 'PREPARING').length;
      const comp = restaurantOrders.filter(o => o.status === 'COMPLETED').length;

      setKpis({
        totalTables: tableSummary.total,
        availableTables: tableSummary.available,
        reservedTables: tableSummary.reserved,
        occupiedTables: tableSummary.occupied,
        maintenanceTables: tableSummary.maintenance,
        todayOrders: restaurantOrders.length,
        preparingOrders: prep,
        completedOrders: comp,
        todayRevenue: revData?.cafeRevenue || 0
      });
    } catch (e) {
      console.warn('Failed loading restaurant data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTableStatusChange = async (tableId, newStatus, reservationData = null) => {
    try {
      await updateTableStatus(tableId, newStatus, reservationData);
      setFeedback({ type: 'success', text: `Table status updated to ${newStatus}.` });
      logAudit({ userName: 'Devendra Joshi', role: 'RESTAURANT_MANAGER', action: 'Table Status Change', entity: 'Table', entityId: tableId, details: `Set table #${tableId} to ${newStatus}` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Status update failed.' });
    }
  };

  const handleOrderStatusChange = async (orderId, newStatus) => {
    if (transitioningOrderId) return;
    setTransitioningOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      setFeedback({ type: 'success', text: `Order #${orderId} moved to ${newStatus}.` });
      logAudit({ userName: 'Devendra Joshi', role: 'RESTAURANT_MANAGER', action: 'Order Lifecycle Update', entity: 'Order', entityId: orderId, details: `Transitioned to ${newStatus}` });
      await loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Invalid status transition.' });
    } finally {
      setTransitioningOrderId(null);
    }
  };

  const handleStockUpdate = async (productId, newStock) => {
    try {
      await updateProduct(productId, { stock_quantity: Math.max(0, parseInt(newStock, 10)) });
      setFeedback({ type: 'success', text: 'Food inventory updated.' });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed updating stock.' });
    }
  };

  const submitReserve = async (e) => {
    e.preventDefault();
    if (!selectedTable) return;
    await handleTableStatusChange(selectedTable.id, 'RESERVED', {
      reserved_by: reserveForm.customer,
      party_size: reserveForm.partySize,
      reservation_time: reserveForm.time,
      notes: reserveForm.notes
    });
    setReserveModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#b45309', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            <Utensils size={16} /> Restaurant Operations Portal
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-main)' }}>Dining & Table Management</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Oversee dining floor tables, customer service queue, kitchen dispatch, and food inventory.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
            <RefreshCw size={15} /> Refresh Floor
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
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Available Tables</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{kpis.availableTables}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of {kpis.totalTables} Total Tables</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Reserved Tables</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.25rem' }}>{kpis.reservedTables}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VIP & Guest Bookings</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Occupied Tables</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>{kpis.occupiedTables}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dining Now</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Under Maintenance</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>{kpis.maintenanceTables}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Off-service</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Today's Orders</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{kpis.todayOrders}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{kpis.preparingOrders} in kitchen</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #d4af37' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Restaurant Revenue</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>₹{kpis.todayRevenue.toFixed(0)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Today's Sales</div>
        </div>
      </div>

      {/* Operational Subtabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'dashboard' ? 'var(--primary)' : 'transparent', color: activeTab === 'dashboard' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Floor & Tables
        </button>
        <button 
          onClick={() => setActiveTab('orders')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'orders' ? 'var(--primary)' : 'transparent', color: activeTab === 'orders' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Active Orders ({orders.length})
        </button>
        <button 
          onClick={() => setActiveTab('kitchen')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'kitchen' ? 'var(--primary)' : 'transparent', color: activeTab === 'kitchen' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Kitchen Dispatch Queue
        </button>
        <button 
          onClick={() => setActiveTab('inventory')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'inventory' ? 'var(--primary)' : 'transparent', color: activeTab === 'inventory' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Food & Kitchen Stock
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: TABLE MANAGEMENT FLOOR CARDS */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Dining Floor Plan ({tables.length} Tables)</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Click any table to update status or reserve
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {tables.map(t => {
              const statusColors = {
                AVAILABLE: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: '#10b981' },
                RESERVED: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: '#3b82f6' },
                OCCUPIED: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: '#f59e0b' },
                UNDER_MAINTENANCE: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: '#ef4444' }
              };
              const sc = statusColors[t.status] || statusColors.AVAILABLE;

              return (
                <div key={t.id} className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', borderTop: `4px solid ${sc.border}`, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.15rem' }}>{t.table_number}</h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.table_name || 'Dining Area'}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.6rem', borderRadius: '999px', background: sc.bg, color: sc.text, textTransform: 'uppercase' }}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div><strong>Capacity:</strong> {t.capacity} Seats</div>
                    {t.status === 'RESERVED' && (
                      <div style={{ background: 'var(--bg-main)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
                        <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{t.reserved_by}</div>
                        <div style={{ fontSize: '0.78rem' }}>Time: {t.reservation_time || 'Tonight'} • Party: {t.party_size || t.capacity}</div>
                        {t.notes && <div style={{ fontSize: '0.75rem', fontStyle: 'italic', marginTop: '2px' }}>"{t.notes}"</div>}
                      </div>
                    )}
                    {t.status === 'UNDER_MAINTENANCE' && (
                      <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>⚠️ {t.notes || 'Under servicing'}</div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {t.status === 'AVAILABLE' && (
                      <>
                        <button 
                          onClick={() => { setSelectedTable(t); setReserveModalOpen(true); }}
                          className="btn btn-secondary" 
                          style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                        >
                          Reserve
                        </button>
                        <button 
                          onClick={() => handleTableStatusChange(t.id, 'OCCUPIED')}
                          className="btn btn-primary" 
                          style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                        >
                          Seat Guests
                        </button>
                      </>
                    )}

                    {t.status === 'RESERVED' && (
                      <>
                        <button 
                          onClick={() => handleTableStatusChange(t.id, 'OCCUPIED')}
                          className="btn btn-primary" 
                          style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                        >
                          Seat Reserved
                        </button>
                        <button 
                          onClick={() => handleTableStatusChange(t.id, 'AVAILABLE')}
                          className="btn btn-secondary" 
                          style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                        >
                          Release
                        </button>
                      </>
                    )}

                    {t.status === 'OCCUPIED' && (
                      <button 
                        onClick={() => handleTableStatusChange(t.id, 'AVAILABLE')}
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '0.45rem', fontSize: '0.78rem', background: '#10b981' }}
                      >
                        Vacate & Clear Table
                      </button>
                    )}

                    {t.status !== 'UNDER_MAINTENANCE' ? (
                      <button 
                        onClick={() => handleTableStatusChange(t.id, 'UNDER_MAINTENANCE', { notes: 'Maintenance inspected' })}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', padding: '2px 4px' }}
                      >
                        Mark Maintenance
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleTableStatusChange(t.id, 'AVAILABLE')}
                        className="btn btn-secondary" 
                        style={{ width: '100%', padding: '0.45rem', fontSize: '0.78rem' }}
                      >
                        Return to Available
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: COMPACT OPERATIONAL RESTAURANT ORDERS TABLE */}
      {/* ======================================================== */}
      {activeTab === 'orders' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Restaurant Food & Beverage Orders</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Compact operational log. Click any row or 'View' for full recipe, party notes & billing details.
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
                  <Utensils size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.35, display: 'block' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No restaurant orders found.</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem' }}>No orders match your search or filter criteria.</p>
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
                            #ORD-{String(o.id).padStart(4, '0')}
                          </td>
                          <td style={{ padding: '0.7rem 0.5rem' }}>
                            <div style={{ fontWeight: 600 }}>{o.members?.name || 'Walk-in Table Guest'}</div>
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
                                  onClick={() => handleOrderStatusChange(o.id, 'PREPARING')}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem' }}
                                >
                                  {isTransitioning ? 'Updating...' : 'Start Preparing'}
                                </button>
                              )}
                              {o.status === 'PREPARING' && (
                                <button
                                  disabled={isTransitioning}
                                  onClick={() => handleOrderStatusChange(o.id, 'READY')}
                                  className="btn btn-primary"
                                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', background: '#3b82f6' }}
                                >
                                  {isTransitioning ? 'Updating...' : 'Mark Ready'}
                                </button>
                              )}
                              {o.status === 'READY' && (
                                <button
                                  disabled={isTransitioning}
                                  onClick={() => handleOrderStatusChange(o.id, 'COMPLETED')}
                                  className="btn btn-primary"
                                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', background: '#10b981' }}
                                >
                                  {isTransitioning ? 'Updating...' : 'Complete & Serve'}
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
      {/* VIEW 3: KITCHEN COMMUNICATION */}
      {/* ======================================================== */}
      {activeTab === 'kitchen' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').map(o => (
            <div key={o.id} className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', borderTop: o.priority === 'URGENT' ? '4px solid #ef4444' : '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem' }}>Ticket #KSC-KIT-{o.id}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '4px', background: o.priority === 'URGENT' ? '#ef4444' : '#3b82f6', color: '#fff' }}>
                  {o.priority || 'NORMAL'}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Customer: <strong>{o.members?.name || 'Walk-in Table'}</strong> • Received: {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Prep Items</div>
                {(o.cafe_order_items || []).map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '0.25rem 0' }}>
                    <span>{it.products?.name || 'Recipe Item'}</span>
                    <strong>× {it.quantity}</strong>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {o.status === 'NEW' && (
                  <button onClick={() => handleOrderStatusChange(o.id, 'PREPARING')} className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.82rem' }}>
                    Accept & Cook
                  </button>
                )}
                {o.status === 'PREPARING' && (
                  <button onClick={() => handleOrderStatusChange(o.id, 'READY')} className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.82rem', background: '#3b82f6' }}>
                    Send to Plating
                  </button>
                )}
                {o.status === 'READY' && (
                  <button onClick={() => handleOrderStatusChange(o.id, 'COMPLETED')} className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.82rem', background: '#10b981' }}>
                    Confirm Served
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 4: RESTAURANT FOOD INVENTORY */}
      {/* ======================================================== */}
      {activeTab === 'inventory' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem' }}>Food & Kitchen Menu Inventory</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Item</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Price</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Current Stock</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Quick Adjust</th>
                </tr>
              </thead>
              <tbody>
                {foodItems.map(p => {
                  const isOut = Number(p.stock_quantity) === 0;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{p.category}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)' }}>₹{Number(p.price).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>{p.stock_quantity} Units</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {isOut ? (
                          <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            OUT OF STOCK
                          </span>
                        ) : Number(p.stock_quantity) <= Number(p.low_stock_threshold || 5) ? (
                          <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            LOW STOCK
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                            AVAILABLE
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        {isOut ? (
                          <button onClick={() => handleStockUpdate(p.id, 20)} className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>
                            Restock (20)
                          </button>
                        ) : (
                          <button onClick={() => handleStockUpdate(p.id, 0)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '0.3rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
                            Mark Out of Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {reserveModalOpen && selectedTable && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>Reserve {selectedTable.table_number}</h3>
              <button onClick={() => setReserveModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={submitReserve} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Customer / Member Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Alex Mercer (Gold Member)"
                  value={reserveForm.customer} 
                  onChange={e => setReserveForm({ ...reserveForm, customer: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Party Size</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={selectedTable.capacity}
                    value={reserveForm.partySize} 
                    onChange={e => setReserveForm({ ...reserveForm, partySize: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Time</label>
                  <input 
                    type="time" 
                    value={reserveForm.time} 
                    onChange={e => setReserveForm({ ...reserveForm, time: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Notes / Special Requests</label>
                <textarea 
                  rows="2"
                  placeholder="e.g. Birthday celebration, poolside booth preference"
                  value={reserveForm.notes} 
                  onChange={e => setReserveForm({ ...reserveForm, notes: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setReserveModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Confirm Reservation</button>
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
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Restaurant Order Details</span>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.4rem' }}>#ORD-{String(selectedOrder.id).padStart(4, '0')}</h3>
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
                <strong style={{ color: '#b45309' }}>{selectedOrder.status}</strong>
              </div>
            </div>

            {/* Line Items */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Food / Beverage Item</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.cafe_order_items || []).map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>{it.products?.name || 'Recipe Item'}</td>
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
                  onClick={() => handleOrderStatusChange(selectedOrder.id, 'PREPARING')}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}
                >
                  {transitioningOrderId === selectedOrder.id ? 'Updating...' : 'Start Preparing'}
                </button>
              )}
              {selectedOrder.status === 'PREPARING' && (
                <button
                  disabled={transitioningOrderId === selectedOrder.id}
                  onClick={() => handleOrderStatusChange(selectedOrder.id, 'READY')}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', background: '#3b82f6' }}
                >
                  {transitioningOrderId === selectedOrder.id ? 'Updating...' : 'Mark Ready'}
                </button>
              )}
              {selectedOrder.status === 'READY' && (
                <button
                  disabled={transitioningOrderId === selectedOrder.id}
                  onClick={() => handleOrderStatusChange(selectedOrder.id, 'COMPLETED')}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', background: '#10b981' }}
                >
                  {transitioningOrderId === selectedOrder.id ? 'Updating...' : 'Complete & Serve'}
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
                    receiptNumber: `#KSC-REC-${String(selectedOrder.id).padStart(4, '0')}`,
                    customerName: selectedOrder.members?.name || 'Dining Table Guest',
                    club_id: selectedOrder.members?.club_id || 'Walk-In',
                    customerType: selectedOrder.members?.user_type === 'MEMBER' ? 'MEMBER' : 'WALK-IN',
                    created_at: selectedOrder.created_at,
                    subtotal: selectedOrder.subtotal || selectedOrder.total,
                    discount_amount: selectedOrder.discount_amount || 0,
                    total: selectedOrder.total,
                    payment_method: selectedOrder.payment_method || 'CARD',
                    payment_status: 'PAID',
                    items: (selectedOrder.cafe_order_items || []).map(it => ({
                      name: it.products?.name || 'Item',
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
