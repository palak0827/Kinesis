import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { supabase } from '@backend/services/supabaseClient.js';
import { getMemberCafeOrders } from '@backend/services/cafeService.js';
import { getMemberPayments } from '@backend/services/paymentService.js';
import ReceiptModal from '../../components/ReceiptModal.jsx';
import { ShoppingBag, Coffee, Award, Receipt } from 'lucide-react';

export default function PurchaseHistory() {
  const { memberProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('cafe'); // 'cafe', 'gear', 'membership'
  const [cafeOrders, setCafeOrders] = useState([]);
  const [gearSales, setGearSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    if (!memberProfile?.id) return;

    async function loadData() {
      setLoading(true);
      try {
        const [orders, allPayments] = await Promise.all([
          getMemberCafeOrders(memberProfile.id),
          getMemberPayments(memberProfile.id)
        ]);
        setCafeOrders(orders || []);
        setPayments(allPayments || []);

        // Also query direct sales for Gear Shop purchases
        if (supabase) {
          const { data: salesData } = await supabase
            .from('sales')
            .select('*, products(*)')
            .eq('member_id', memberProfile.id)
            .order('created_at', { ascending: false });
          setGearSales(salesData || []);
        }
      } catch (e) {
        console.error('Error fetching purchase history:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [memberProfile?.id]);

  const handleOpenReceipt = (type, item) => {
    let receiptData = {};
    if (type === 'CAFE_BAR') {
      receiptData = {
        id: item.id,
        receiptNumber: `#KSC-CAFE-${String(item.id).padStart(4, '0')}`,
        customerName: memberProfile?.name || 'Club Member',
        created_at: item.created_at,
        subtotal: item.subtotal || item.total,
        discount_amount: item.discount_amount || 0,
        total: item.total,
        payment_method: item.payment_method || 'CARD',
        payment_status: item.payment_status || 'PAID',
        status: item.status,
        items: (item.cafe_order_items || []).map((it) => ({
          name: it.products?.name,
          quantity: it.quantity,
          unitPrice: it.unit_price,
          total: it.total
        }))
      };
    } else if (type === 'GEAR_SHOP') {
      receiptData = {
        id: item.id,
        receiptNumber: `#KSC-GEAR-${String(item.id).padStart(4, '0')}`,
        customerName: memberProfile?.name || 'Club Member',
        created_at: item.created_at,
        subtotal: item.total,
        discount_amount: 0,
        total: item.total,
        payment_method: item.payment_method || 'CARD',
        payment_status: 'PAID',
        items: [
          {
            name: item.products?.name || `Gear Item #${item.product_id}`,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: item.total
          }
        ]
      };
    } else if (type === 'MEMBERSHIP') {
      receiptData = {
        id: item.id,
        receiptNumber: `#KSC-MEM-${String(item.id).padStart(4, '0')}`,
        customerName: memberProfile?.name || 'Club Member',
        created_at: item.created_at,
        subtotal: item.amount,
        discount_amount: 0,
        total: item.amount,
        payment_method: item.payment_method || 'CARD',
        payment_status: item.payment_status || 'PAID',
        planName: memberProfile?.membership_plans?.name || 'Club',
        durationMonths: item.payment_details?.months || 12
      };
    }

    setSelectedReceipt({ type, data: receiptData });
  };

  const membershipPayments = payments.filter((p) => p.reference_type === 'MEMBERSHIP');

  return (
    <div style={{ maxWidth: '960px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Receipt size={28} color="var(--primary)" />
          <span>Purchase & Billing History</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          View official receipts, invoices, and payment statuses across your club transactions.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('cafe')}
          className="btn"
          style={{
            background: activeTab === 'cafe' ? '#f59e0b' : 'var(--bg-surface)',
            color: activeTab === 'cafe' ? 'white' : 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            padding: '0.6rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <Coffee size={16} />
          <span>Café & Bar Orders ({cafeOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('gear')}
          className="btn"
          style={{
            background: activeTab === 'gear' ? 'var(--primary)' : 'var(--bg-surface)',
            color: activeTab === 'gear' ? 'white' : 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            padding: '0.6rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <ShoppingBag size={16} />
          <span>Gear Shop Purchases ({gearSales.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('membership')}
          className="btn"
          style={{
            background: activeTab === 'membership' ? '#8b5cf6' : 'var(--bg-surface)',
            color: activeTab === 'membership' ? 'white' : 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            padding: '0.6rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <Award size={16} />
          <span>Membership Payments ({membershipPayments.length})</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          Loading your billing transactions...
        </div>
      ) : (
        <div>
          {/* TAB 1: CAFÉ & BAR ORDERS */}
          {activeTab === 'cafe' && (
            <div>
              {cafeOrders.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>No past Café & Bar orders recorded.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {cafeOrders.map((order) => (
                    <div
                      key={order.id}
                      className="card"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem 1.5rem',
                        borderLeft: '4px solid #f59e0b'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem' }}>
                            Order #{order.id}
                          </span>
                          <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            Kitchen: {order.status}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                          {new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order.cafe_order_items?.length || 0} items
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            ₹{Number(order.total).toFixed(2)}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                            {order.payment_status || 'PAID'} ({order.payment_method || 'UPI/Card'})
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenReceipt('CAFE_BAR', order)}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                          View Bill
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GEAR SHOP PURCHASES */}
          {activeTab === 'gear' && (
            <div>
              {gearSales.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>No Gear Shop purchases recorded yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {gearSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="card"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem 1.5rem',
                        borderLeft: '4px solid var(--primary)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                          {sale.products?.name || `Gear Product #${sale.product_id}`}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                          {new Date(sale.created_at).toLocaleDateString()} • Qty: {sale.quantity} @ ₹{Number(sale.unit_price).toFixed(2)}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                            ₹{Number(sale.total).toFixed(2)}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                            PAID (Shop POS)
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenReceipt('GEAR_SHOP', sale)}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MEMBERSHIP PAYMENTS */}
          {activeTab === 'membership' && (
            <div>
              {membershipPayments.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                    No separate membership payments recorded in this session.
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Current active tier: <strong>{memberProfile?.membership_plans?.name || 'Standard'}</strong> (Valid until {new Date(memberProfile?.expiry_date || Date.now()).toLocaleDateString()})
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {membershipPayments.map((p) => (
                    <div
                      key={p.id}
                      className="card"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem 1.5rem',
                        borderLeft: '4px solid #8b5cf6'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                          Club Membership Subscription
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                          {new Date(p.created_at).toLocaleDateString()} • Ref: #KSC-PAY-{p.id} • Method: {p.payment_method}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#8b5cf6' }}>
                            ₹{Number(p.amount).toFixed(2)}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: p.payment_status === 'PAID' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                            {p.payment_status}
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenReceipt('MEMBERSHIP', p)}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          receiptType={selectedReceipt.type}
          data={selectedReceipt.data}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
