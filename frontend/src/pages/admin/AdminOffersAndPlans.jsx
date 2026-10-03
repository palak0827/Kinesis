import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { getOffers, createOffer, toggleOfferActive, getAuditLogs, logAudit } from '../../services/clubPlatformService.js';
import {
  Award, Tag, ShieldCheck, Plus, RefreshCw, CheckCircle2,
  Calendar, Percent, DollarSign, X, Edit3, ArrowRight, History
} from 'lucide-react';

export default function AdminOffersAndPlans({ navigate }) {
  const [activeTab, setActiveTab] = useState('plans'); // 'plans' | 'offers' | 'audit'
  const [plans, setPlans] = useState([]);
  const [offers, setOffers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Edit Plan modal state
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    monthly_price: 4999,
    court_discount: 50,
    shop_discount: 20,
    bar_discount: 15,
    daily_booking_limit: 3
  });

  // Create Offer modal state
  const [createOfferModalOpen, setCreateOfferModalOpen] = useState(false);
  const [offerForm, setOfferForm] = useState({
    name: '',
    description: '',
    discount_percent: 15,
    applicable_to: 'All',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    is_active: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      let plansData = [];
      if (supabase) {
        const { data } = await supabase.from('membership_plans').select('*').order('id', { ascending: true });
        plansData = data || [];
      }
      if (plansData.length === 0) {
        plansData = [
          { id: 1, name: 'Gold', monthly_price: 4999, court_discount: 50, shop_discount: 20, bar_discount: 15, daily_booking_limit: 3 },
          { id: 2, name: 'Silver', monthly_price: 2999, court_discount: 25, shop_discount: 10, bar_discount: 10, daily_booking_limit: 2 },
          { id: 3, name: 'Junior', monthly_price: 1999, court_discount: 35, shop_discount: 15, bar_discount: 10, daily_booking_limit: 2 }
        ];
      }
      setPlans(plansData);

      const [offersData, auditData] = await Promise.all([
        getOffers(),
        getAuditLogs(50)
      ]);
      setOffers(offersData || []);
      setAuditLogs(auditData || []);
    } catch (err) {
      console.warn('Failed loading offers and plans data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditPlan = (p) => {
    setSelectedPlan(p);
    setPlanForm({
      name: p.name,
      monthly_price: p.monthly_price,
      court_discount: p.court_discount,
      shop_discount: p.shop_discount,
      bar_discount: p.bar_discount,
      daily_booking_limit: p.daily_booking_limit
    });
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      const updates = {
        monthly_price: Number(planForm.monthly_price),
        court_discount: Number(planForm.court_discount),
        shop_discount: Number(planForm.shop_discount),
        bar_discount: Number(planForm.bar_discount),
        daily_booking_limit: Number(planForm.daily_booking_limit)
      };

      if (supabase) {
        await supabase.from('membership_plans').update(updates).eq('id', selectedPlan.id);
      }

      setFeedback({ type: 'success', text: `Successfully updated ${selectedPlan.name} tier configurations in database.` });
      logAudit({
        userName: 'Club Administrator',
        role: 'ADMIN',
        action: 'Modified Membership Plan',
        entity: 'Plan',
        entityId: selectedPlan.id,
        details: `Updated ${selectedPlan.name}: Court Disc ${updates.court_discount}%, Shop Disc ${updates.shop_discount}%, Rate ₹${updates.monthly_price}`
      });

      setSelectedPlan(null);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed saving plan updates.' });
    }
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    try {
      await createOffer(offerForm);
      setFeedback({ type: 'success', text: `Created special offer: ${offerForm.name}!` });
      setCreateOfferModalOpen(false);
      setOfferForm({
        name: '',
        description: '',
        discount_percent: 15,
        applicable_to: 'All',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        is_active: true
      });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed creating offer.' });
    }
  };

  const handleToggleOffer = async (id, currentActive) => {
    try {
      await toggleOfferActive(id, !currentActive);
      setFeedback({ type: 'success', text: `Offer status changed to ${!currentActive ? 'Active' : 'Inactive'}.` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed toggling offer.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            <Award size={16} /> Club Policy & Offer Management
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-main)' }}>Offers, Plans & Audit System</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Configure live membership plan discounts, launch festival seasonal offers, and monitor club audit logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setCreateOfferModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem' }}>
            <Plus size={16} /> Create Festival Offer
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

      {/* Subtabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('plans')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'plans' ? 'var(--primary)' : 'transparent', color: activeTab === 'plans' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Membership Plans Configuration ({plans.length})
        </button>
        <button 
          onClick={() => setActiveTab('offers')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'offers' ? 'var(--primary)' : 'transparent', color: activeTab === 'offers' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Festival & Special Offers ({offers.length})
        </button>
        <button 
          onClick={() => setActiveTab('audit')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'audit' ? 'var(--primary)' : 'transparent', color: activeTab === 'audit' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Platform Audit & Activity Log ({auditLogs.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: MEMBERSHIP PLANS CONFIGURATION (JURY FRIENDLY) */}
      {/* ======================================================== */}
      {activeTab === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.5rem' }}>
          {plans.map(p => (
            <div key={p.id} className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)', borderTop: '4px solid var(--primary)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{p.name} Tier</h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>
                  ₹{Number(p.monthly_price).toLocaleString('en-IN')}/mo
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem', margin: '1rem 0 1.5rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Court Booking Discount:</span>
                  <strong style={{ color: '#10b981' }}>{p.court_discount}% OFF</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gear Shop Discount:</span>
                  <strong style={{ color: '#10b981' }}>{p.shop_discount}% OFF</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Café & Bar Discount:</span>
                  <strong style={{ color: '#10b981' }}>{p.bar_discount}% OFF</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Daily Court Limit:</span>
                  <strong>{p.daily_booking_limit} Bookings / Day</strong>
                </div>
              </div>

              <button
                onClick={() => openEditPlan(p)}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.65rem', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Edit3 size={15} /> Modify {p.name} Parameters
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: FESTIVAL & SPECIAL OFFERS */}
      {/* ======================================================== */}
      {activeTab === 'offers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {offers.map(o => (
            <div key={o.id} className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)', borderLeft: o.is_active ? '4px solid #10b981' : '4px solid #94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{o.name}</h3>
                <span style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: o.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                  color: o.is_active ? '#10b981' : '#64748b'
                }}>
                  {o.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {o.description}
              </p>

              <div style={{ background: 'var(--bg-main)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Discount Rate:</span>
                  <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>{o.discount_percent}% OFF</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Applicable To:</span>
                  <strong>{o.applicable_to}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Valid Through:</span>
                  <span>{o.start_date} to {o.end_date}</span>
                </div>
              </div>

              <button
                onClick={() => handleToggleOffer(o.id, o.is_active)}
                className={o.is_active ? 'btn btn-secondary' : 'btn btn-primary'}
                style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
              >
                {o.is_active ? 'Deactivate Offer' : 'Activate Offer'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: AUDIT & ACTIVITY LOG */}
      {/* ======================================================== */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem' }}>Club Operations Audit Trail</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>User & Role</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Action Executed</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Entity</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{a.user_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>{a.role}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{a.action}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ background: 'var(--bg-main)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                        {a.entity} #{a.entity_id}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {selectedPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>Configure {selectedPlan.name} Tier</h3>
              <button onClick={() => setSelectedPlan(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Monthly Fee (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  required
                  value={planForm.monthly_price} 
                  onChange={e => setPlanForm({ ...planForm, monthly_price: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Court Discount (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={planForm.court_discount} 
                    onChange={e => setPlanForm({ ...planForm, court_discount: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Gear Discount (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={planForm.shop_discount} 
                    onChange={e => setPlanForm({ ...planForm, shop_discount: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Café / Bar Discount (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={planForm.bar_discount} 
                    onChange={e => setPlanForm({ ...planForm, bar_discount: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Daily Booking Limit</label>
                  <input 
                    type="number" 
                    min="1"
                    max="10"
                    value={planForm.daily_booking_limit} 
                    onChange={e => setPlanForm({ ...planForm, daily_booking_limit: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setSelectedPlan(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save in Database</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Offer Modal */}
      {createOfferModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>Create Festival / Special Offer</h3>
              <button onClick={() => setCreateOfferModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateOffer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Offer Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Navratri Festival Pass"
                  value={offerForm.name} 
                  onChange={e => setOfferForm({ ...offerForm, name: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Description</label>
                <textarea 
                  rows="2"
                  placeholder="Special celebration discount for all club courts & dining"
                  value={offerForm.description} 
                  onChange={e => setOfferForm({ ...offerForm, description: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Discount (%)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    required
                    value={offerForm.discount_percent} 
                    onChange={e => setOfferForm({ ...offerForm, discount_percent: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Applicable To</label>
                  <select 
                    value={offerForm.applicable_to} 
                    onChange={e => setOfferForm({ ...offerForm, applicable_to: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="All">All Departments</option>
                    <option value="Membership">Membership Tiers</option>
                    <option value="Courts">Courts</option>
                    <option value="Gear Shop">Gear Shop</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Bar">Bar</option>
                    <option value="Walk-ins">Walk-ins</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Start Date</label>
                  <input 
                    type="date" 
                    value={offerForm.start_date} 
                    onChange={e => setOfferForm({ ...offerForm, start_date: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>End Date</label>
                  <input 
                    type="date" 
                    value={offerForm.end_date} 
                    onChange={e => setOfferForm({ ...offerForm, end_date: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setCreateOfferModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Publish Offer</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
