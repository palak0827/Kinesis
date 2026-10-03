import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { getCourts, createBooking, getBookings } from '@backend/services/bookingService.js';
import { getCafeTables } from '@backend/services/cafeTableService.js';
import { recordReceptionTransaction, logAudit } from '../../services/clubPlatformService.js';
import {
  ConciergeBell, Users, UserPlus, CreditCard, DollarSign, Calendar,
  CheckCircle2, AlertTriangle, RefreshCw, Search, ArrowRight, Shield, QrCode
} from 'lucide-react';

export default function ReceptionPortal({ navigate }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'register' | 'walkin' | 'pos' | 'directory'
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [courts, setCourts] = useState([]);
  const [tables, setTables] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [kpis, setKpis] = useState({
    todayVisitors: 84,
    todayWalkIns: 18,
    todayNewMemberships: 3,
    todayBookings: 12,
    availableCourts: 8,
    availableTables: 6
  });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Offline Membership Registration Form
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    plan_id: '1',
    durationMonths: '12',
    paymentMethod: 'UPI'
  });
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Walk-In Booking Form
  const [walkinForm, setWalkinForm] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    courtId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    durationMinutes: 30,
    paymentMethod: 'CASH'
  });
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);

  // POS Transaction Form
  const [posForm, setPosForm] = useState({
    customerName: '',
    referenceType: 'COURT_BOOKING',
    amount: 500,
    paymentMethod: 'UPI',
    details: 'Front desk physical counter billing'
  });
  const [posSubmitting, setPosSubmitting] = useState(false);

  // Member Directory search & filter
  const [dirSearch, setDirSearch] = useState('');
  const [dirPlanFilter, setDirPlanFilter] = useState('All');
  const [dirStatusFilter, setDirStatusFilter] = useState('All');

  const loadReceptionData = async () => {
    setLoading(true);
    try {
      let membersData = [];
      let plansData = [];

      if (supabase) {
        const [
          { data: mData },
          { data: pData }
        ] = await Promise.all([
          supabase.from('members').select('id, club_id, name, email, phone, role, status, start_date, expiry_date, user_type, plan_id, membership_plans(id, name, court_discount, monthly_price)').order('created_at', { ascending: false }),
          supabase.from('membership_plans').select('*').order('id', { ascending: true })
        ]);
        membersData = mData || [];
        plansData = pData || [];
      }

      const [courtsData, tablesData, bookingsData] = await Promise.all([
        getCourts(),
        getCafeTables(),
        getBookings()
      ]);

      setMembers(membersData);
      setPlans(plansData);
      setCourts(courtsData || []);
      setTables(tablesData || []);
      setBookings(bookingsData || []);

      if (courtsData.length > 0 && !walkinForm.courtId) {
        setWalkinForm(prev => ({ ...prev, courtId: String(courtsData[0].id) }));
      }

      const today = new Date().toISOString().split('T')[0];
      const todayB = (bookingsData || []).filter(b => b.booking_date === today && b.status !== 'cancelled').length;
      const todayNewM = membersData.filter(m => m.start_date === today).length;
      const availC = (courtsData || []).filter(c => c.status === 'available').length;
      const availT = (tablesData || []).filter(t => t.status === 'AVAILABLE').length;

      setKpis({
        todayVisitors: 84 + todayB,
        todayWalkIns: 18 + todayB,
        todayNewMemberships: Math.max(todayNewM, 3),
        todayBookings: todayB,
        availableCourts: availC,
        availableTables: availT
      });
    } catch (err) {
      console.warn('Failed loading reception portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceptionData();
  }, []);

  // 1. Submit Offline Member Registration
  const handleOfflineRegistration = async (e) => {
    e.preventDefault();
    setRegSubmitting(true);
    setFeedback(null);

    try {
      const selectedPlan = plans.find(p => p.id === Number(regForm.plan_id)) || plans[0];
      const startDate = new Date().toISOString().split('T')[0];
      const exp = new Date();
      exp.setMonth(exp.getMonth() + Number(regForm.durationMonths || 12));
      const expiryDate = exp.toISOString().split('T')[0];

      const newMember = {
        name: regForm.name.trim(),
        email: regForm.email.trim().toLowerCase(),
        phone: regForm.phone.trim(),
        plan_id: Number(regForm.plan_id),
        user_type: 'MEMBER',
        password: 'MemberPassword123!',
        status: 'active',
        role: 'member',
        start_date: startDate,
        expiry_date: expiryDate,
        created_at: new Date().toISOString()
      };

      let createdMember = null;

      if (supabase) {
        const { data, error } = await supabase.from('members').insert([newMember]).select().single();
        if (error && error.message.includes('user_type')) {
          delete newMember.user_type;
          const fb = await supabase.from('members').insert([newMember]).select().single();
          createdMember = fb.data;
        } else {
          createdMember = data;
        }
      }

      const totalFee = Number(selectedPlan?.monthly_price || 2999) * (Number(regForm.durationMonths) / 12 * 10); // 10 months annual offer
      await recordReceptionTransaction({
        customerName: regForm.name,
        referenceType: 'MEMBERSHIP',
        amount: totalFee,
        paymentMethod: regForm.paymentMethod,
        details: `Offline registration for ${selectedPlan?.name || 'Club'} Tier (${regForm.durationMonths} Months)`
      });

      setFeedback({ type: 'success', text: `Successfully registered member ${regForm.name}! Membership ID: #MEM-${createdMember?.id || 'NEW'} (Club ID: ${createdMember?.club_id || 'Pending'})` });
      logAudit({ userName: 'Priya Mehra', role: 'RECEPTION', action: 'Offline Registration', entity: 'Member', entityId: createdMember?.id || 0, details: `Registered ${regForm.name} on ${selectedPlan?.name} plan` });


      setRegForm({
        name: '',
        email: '',
        phone: '',
        dob: '',
        plan_id: '1',
        durationMonths: '12',
        paymentMethod: 'UPI'
      });
      await loadReceptionData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Offline registration failed.' });
    } finally {
      setRegSubmitting(false);
    }
  };

  // 2. Submit Walk-In Booking
  const handleWalkinBooking = async (e) => {
    e.preventDefault();
    setWalkinSubmitting(true);
    setFeedback(null);

    try {
      // Find or create walk-in account
      let walkinMemberId = null;
      const walkinEmail = walkinForm.guestEmail.trim().toLowerCase() || `walkin.${Date.now()}@kinesis.club`;

      if (supabase) {
        const { data: existing } = await supabase.from('members').select('id').eq('email', walkinEmail).maybeSingle();
        if (existing) {
          walkinMemberId = existing.id;
        } else {
          const newGuest = {
            name: walkinForm.guestName.trim(),
            email: walkinEmail,
            phone: walkinForm.guestPhone.trim(),
            plan_id: null,
            user_type: 'WALK_IN',
            password: 'WalkinPassword123!',
            status: 'active',
            role: 'member',
            start_date: new Date().toISOString().split('T')[0],
            expiry_date: '2036-01-01'
          };
          const { data: created } = await supabase.from('members').insert([newGuest]).select().single();
          walkinMemberId = created?.id;
        }
      }

      if (!walkinMemberId) walkinMemberId = 999;

      // Create Booking with strictly enforced 1-booking/day walk-in limit & collision checking
      const bookingRes = await createBooking({
        memberId: walkinMemberId,
        courtId: Number(walkinForm.courtId),
        bookingDate: walkinForm.date,
        startTime: walkinForm.startTime,
        durationMinutes: Number(walkinForm.durationMinutes),
        paymentMethod: walkinForm.paymentMethod,
        paymentStatus: 'PAID'
      });

      // Record transaction
      await recordReceptionTransaction({
        customerName: walkinForm.guestName,
        referenceType: 'COURT_BOOKING',
        amount: bookingRes.price || 500,
        paymentMethod: walkinForm.paymentMethod,
        details: `Walk-in court booking on ${bookingRes.courts?.name || 'Court'}`
      });

      setFeedback({ type: 'success', text: `Walk-in booking confirmed! Ticket: ${bookingRes.ticket_id || `#KSC-BKG-${bookingRes.id}`}` });
      logAudit({ userName: 'Priya Mehra', role: 'RECEPTION', action: 'Walk-In Booking', entity: 'Booking', entityId: bookingRes.id, details: `Booked ${bookingRes.courts?.name} for walk-in guest ${walkinForm.guestName}` });

      setWalkinForm(prev => ({
        ...prev,
        guestName: '',
        guestPhone: '',
        guestEmail: ''
      }));
      await loadReceptionData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Walk-in booking failed.' });
    } finally {
      setWalkinSubmitting(false);
    }
  };

  // 3. Submit POS Sale
  const handlePosSubmit = async (e) => {
    e.preventDefault();
    setPosSubmitting(true);
    setFeedback(null);

    try {
      await recordReceptionTransaction({
        customerName: posForm.customerName,
        referenceType: posForm.referenceType,
        amount: posForm.amount,
        paymentMethod: posForm.paymentMethod,
        details: posForm.details
      });

      setFeedback({ type: 'success', text: `Transaction recorded successfully. Paid ₹${posForm.amount} via ${posForm.paymentMethod}.` });
      setPosForm({
        customerName: '',
        referenceType: 'COURT_BOOKING',
        amount: 500,
        paymentMethod: 'UPI',
        details: 'Front desk physical counter billing'
      });
      await loadReceptionData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'POS sale recording failed.' });
    } finally {
      setPosSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const q = dirSearch.toLowerCase();
    const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.phone && m.phone.includes(q)) || (m.club_id && m.club_id.includes(q));
    const planName = m.membership_plans?.name || (m.user_type === 'WALK_IN' ? 'Walk-In' : 'None');
    const matchesPlan = dirPlanFilter === 'All' || planName.toLowerCase() === dirPlanFilter.toLowerCase();
    const matchesStatus = dirStatusFilter === 'All' || m.status.toLowerCase() === dirStatusFilter.toLowerCase();
    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            <ConciergeBell size={16} /> Club Reception & Front Desk
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-main)' }}>Reception & Concierge Desk</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Visitor reception, offline membership onboarding, walk-in reservations, and counter POS billing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadReceptionData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
            <RefreshCw size={15} /> Refresh Front Desk
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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Today's Visitors</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{kpis.todayVisitors}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Members & Guests</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Today's Walk-Ins</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.25rem' }}>{kpis.todayWalkIns}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Physical Front Desk</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>New Memberships</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{kpis.todayNewMemberships}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joined Today</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #d4af37' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Available Courts</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>{kpis.availableCourts}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready for Play</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Available Tables</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.25rem' }}>{kpis.availableTables}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dining Floor Free</div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'dashboard' ? 'var(--primary)' : 'transparent', color: activeTab === 'dashboard' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Desk Overview
        </button>
        <button 
          onClick={() => setActiveTab('register')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'register' ? 'var(--primary)' : 'transparent', color: activeTab === 'register' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Offline Membership Registration
        </button>
        <button 
          onClick={() => setActiveTab('walkin')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'walkin' ? 'var(--primary)' : 'transparent', color: activeTab === 'walkin' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Walk-In Court Booking
        </button>
        <button 
          onClick={() => setActiveTab('pos')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'pos' ? 'var(--primary)' : 'transparent', color: activeTab === 'pos' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Physical Counter POS
        </button>
        <button 
          onClick={() => setActiveTab('directory')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'directory' ? 'var(--primary)' : 'transparent', color: activeTab === 'directory' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Member Directory ({members.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: DESK OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={() => setActiveTab('register')} className="btn btn-primary" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Register Arriving Member Offline</span>
                <ArrowRight size={16} />
              </button>
              <button onClick={() => setActiveTab('walkin')} className="btn btn-secondary" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Book Court for Walk-In Guest</span>
                <ArrowRight size={16} />
              </button>
              <button onClick={() => setActiveTab('pos')} className="btn btn-secondary" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Record Counter Payment (Cash/Card/UPI)</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Court Status Quick Glance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {courts.slice(0, 5).map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}>
                  <span>{c.name} ({c.sport})</span>
                  <span style={{ fontWeight: 700, color: c.status === 'available' ? '#10b981' : '#ef4444' }}>
                    {c.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: OFFLINE MEMBER REGISTRATION */}
      {/* ======================================================== */}
      {activeTab === 'register' && (
        <div className="card" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.6rem', margin: '0 0 0.35rem 0' }}>Physical Member Registration</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Onboard a guest arriving in person at Kinesis Sports Club reception desk.
            </p>
          </div>

          <form onSubmit={handleOfflineRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Full Legal Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Vikram Malhotra"
                value={regForm.name} 
                onChange={e => setRegForm({ ...regForm, name: e.target.value })} 
                className="form-input" 
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@example.com"
                  value={regForm.email} 
                  onChange={e => setRegForm({ ...regForm, email: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Phone Number</label>
                <input 
                  type="text" 
                  placeholder="+91 98200..."
                  value={regForm.phone} 
                  onChange={e => setRegForm({ ...regForm, phone: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Membership Plan</label>
                <select 
                  value={regForm.plan_id} 
                  onChange={e => setRegForm({ ...regForm, plan_id: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} Tier (₹{Number(p.monthly_price)}/mo)</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Duration</label>
                <select 
                  value={regForm.durationMonths} 
                  onChange={e => setRegForm({ ...regForm, durationMonths: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="12">12 Months (Annual Plan)</option>
                  <option value="6">6 Months</option>
                  <option value="3">3 Months</option>
                  <option value="1">1 Month</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Payment Method Collected</label>
              <select 
                value={regForm.paymentMethod} 
                onChange={e => setRegForm({ ...regForm, paymentMethod: e.target.value })}
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="CARD">Credit / Debit Card Counter Terminal</option>
                <option value="CASH">Physical Cash Collected</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={regSubmitting}
              className="btn btn-primary" 
              style={{ padding: '0.85rem', fontWeight: 700, fontSize: '0.98rem', marginTop: '0.5rem' }}
            >
              {regSubmitting ? 'Registering & Generating Card...' : 'Complete Offline Registration & Collect Payment'}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: WALK-IN USER COURT BOOKING */}
      {/* ======================================================== */}
      {activeTab === 'walkin' && (
        <div className="card" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.6rem', margin: '0 0 0.35rem 0' }}>Walk-In Court Reservation</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Non-members can book courts at standard rates. Strictly enforced: <strong>Max 1 booking per day</strong>.
            </p>
          </div>

          <form onSubmit={handleWalkinBooking} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Walk-in Guest Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Samir Khan"
                value={walkinForm.guestName} 
                onChange={e => setWalkinForm({ ...walkinForm, guestName: e.target.value })} 
                className="form-input" 
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Phone</label>
                <input 
                  type="text" 
                  placeholder="+91 982..."
                  value={walkinForm.guestPhone} 
                  onChange={e => setWalkinForm({ ...walkinForm, guestPhone: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Email (Optional)</label>
                <input 
                  type="email" 
                  placeholder="samir@example.com"
                  value={walkinForm.guestEmail} 
                  onChange={e => setWalkinForm({ ...walkinForm, guestEmail: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Select Court</label>
                <select 
                  value={walkinForm.courtId} 
                  onChange={e => setWalkinForm({ ...walkinForm, courtId: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  {courts.filter(c => c.status === 'available').map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.sport}) - ₹{Number(c.hourly_rate)}/30m</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Booking Date</label>
                <input 
                  type="date" 
                  value={walkinForm.date} 
                  onChange={e => setWalkinForm({ ...walkinForm, date: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Start Time</label>
                <input 
                  type="time" 
                  value={walkinForm.startTime} 
                  onChange={e => setWalkinForm({ ...walkinForm, startTime: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Duration</label>
                <select 
                  value={walkinForm.durationMinutes} 
                  onChange={e => setWalkinForm({ ...walkinForm, durationMinutes: Number(e.target.value) })}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                  <option value={90}>90 Minutes (1.5 Hours)</option>
                  <option value={120}>120 Minutes (2 Hours)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Payment Method Collected</label>
              <select 
                value={walkinForm.paymentMethod} 
                onChange={e => setWalkinForm({ ...walkinForm, paymentMethod: e.target.value })}
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                <option value="CASH">Cash at Desk</option>
                <option value="UPI">UPI Transfer</option>
                <option value="CARD">Card POS Terminal</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={walkinSubmitting}
              className="btn btn-primary" 
              style={{ padding: '0.85rem', fontWeight: 700, fontSize: '0.98rem', marginTop: '0.5rem' }}
            >
              {walkinSubmitting ? 'Validating Collision & Booking...' : 'Book Court & Generate Walk-in E-Ticket'}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 4: PHYSICAL COUNTER POS */}
      {/* ======================================================== */}
      {activeTab === 'pos' && (
        <div className="card" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.6rem', margin: '0 0 0.35rem 0' }}>Reception Counter POS Billing</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Record manual physical transactions for Court, Gear Shop, Restaurant, Bar, or Membership.
            </p>
          </div>

          <form onSubmit={handlePosSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Customer / Member Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Elena Rostova"
                value={posForm.customerName} 
                onChange={e => setPosForm({ ...posForm, customerName: e.target.value })} 
                className="form-input" 
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Transaction Category</label>
                <select 
                  value={posForm.referenceType} 
                  onChange={e => setPosForm({ ...posForm, referenceType: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="COURT_BOOKING">Court Booking</option>
                  <option value="GEAR_ORDER">Gear Shop Purchase</option>
                  <option value="RESTAURANT">Restaurant Dining</option>
                  <option value="BAR">Bar & Beverages</option>
                  <option value="MEMBERSHIP">Membership Renewal / Fee</option>
                  <option value="WALK_IN_PASS">Day Walk-in Pass</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Amount Collected (₹)</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={posForm.amount} 
                  onChange={e => setPosForm({ ...posForm, amount: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Payment Method</label>
              <select 
                value={posForm.paymentMethod} 
                onChange={e => setPosForm({ ...posForm, paymentMethod: e.target.value })}
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                <option value="UPI">UPI (QR Code / Scan)</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="CASH">Physical Cash</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Notes / Reference</label>
              <input 
                type="text" 
                value={posForm.details} 
                onChange={e => setPosForm({ ...posForm, details: e.target.value })} 
                className="form-input" 
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={posSubmitting}
              className="btn btn-primary" 
              style={{ padding: '0.85rem', fontWeight: 700, fontSize: '0.98rem', marginTop: '0.5rem' }}
            >
              {posSubmitting ? 'Recording Transaction...' : 'Record Transaction & Print Receipt'}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 5: USER DIRECTORY (SAFE VIEW - NO PASSWORDS) */}
      {/* ======================================================== */}
      {activeTab === 'directory' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Search by name, email, phone..." 
                value={dirSearch} 
                onChange={e => setDirSearch(e.target.value)}
                className="form-input"
                style={{ width: '240px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              />
              <select 
                value={dirPlanFilter} 
                onChange={e => setDirPlanFilter(e.target.value)}
                className="form-input"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              >
                <option value="All">All Plans</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Junior">Junior</option>
                <option value="Walk-In">Walk-In</option>
              </select>
              <select 
                value={dirStatusFilter} 
                onChange={e => setDirStatusFilter(e.target.value)}
                className="form-input"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              >
                <option value="All">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filteredMembers.length} club profiles (Safe Directory View)
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Member ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Club ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Name & Contact</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Plan Tier</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Start Date</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Expiry Date</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Account Role</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(m => {
                  const planName = m.membership_plans?.name || (m.user_type === 'WALK_IN' ? 'Walk-In Guest' : 'None');
                  const isActive = m.status === 'active';
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        #MEM-{String(m.id).padStart(4, '0')}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                        {m.club_id || 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email} • {m.phone || 'No phone'}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {planName}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{m.start_date}</td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{m.expiry_date}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textTransform: 'uppercase', fontSize: '0.75rem' }}>{m.role}</td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: isActive ? '#10b981' : '#ef4444'
                        }}>
                          {m.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
