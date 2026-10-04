import React, { useState, useEffect } from 'react';
import {
  Briefcase, Calendar, Clock, DollarSign, Award,
  CheckCircle2, XCircle,
  Download, Plus, RefreshCw, Shield, MapPin, LogIn, LogOut
} from 'lucide-react';
import CurrentDate from '../../components/CurrentDate.jsx';
import { getStaffList, getStaffLeaves, logAudit } from '../../services/clubPlatformService.js';
import StaffManagerPortal from '../staffManager/StaffManagerPortal.jsx';

export default function StaffDashboard({ user, role, navigate }) {
  const [activeTab, setActiveTab] = useState('work'); // 'work' | 'holidays' | 'salary' | 'leave' | 'achievements' | 'manager'
  const [loading, setLoading] = useState(true);
  const [staffRecord, setStaffRecord] = useState(null);
  const [clockedIn, setClockedIn] = useState(true);
  const [clockTime, setClockTime] = useState('08:55 AM');
  const [leaves, setLeaves] = useState([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // New leave form
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'Casual Leave',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    reason: ''
  });

  const isStaffManager = (role || '').toUpperCase() === 'STAFF_MANAGER' || (role || '').toUpperCase() === 'ADMIN';

  // Club official holidays
  const clubHolidays = [
    { date: '2026-01-26', name: 'Republic Day', type: 'National Holiday', paid: true },
    { date: '2026-03-04', name: 'Holi (Festival of Colours)', type: 'Club Holiday', paid: true },
    { date: '2026-05-01', name: 'Maharashtra Day / Labour Day', type: 'State Holiday', paid: true },
    { date: '2026-08-15', name: 'Independence Day', type: 'National Holiday', paid: true },
    { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', type: 'National Holiday', paid: true },
    { date: '2026-11-08', name: 'Diwali (Laxmi Pujan)', type: 'Club Special Holiday', paid: true },
    { date: '2026-11-09', name: 'Diwali (Govardhan Puja)', type: 'Club Special Holiday', paid: true },
    { date: '2026-12-25', name: 'Christmas Day', type: 'Public Holiday', paid: true }
  ];

  // Achievements
  const achievements = [
    {
      id: 1,
      badge: 'Club MVP 2026',
      desc: 'Awarded for extraordinary customer ratings and zero operational discrepancies.',
      icon: '🌟',
      date: 'Aug 2026'
    },
    {
      id: 2,
      badge: 'Punctuality Champion',
      desc: '100% on-time shift clock-ins for 6 consecutive months.',
      icon: '⚡',
      date: 'Jul 2026'
    },
    {
      id: 3,
      badge: '5-Star Hospitality Star',
      desc: 'Consistently praised in member concierge reviews.',
      icon: '🛡️',
      date: 'May 2026'
    },
    {
      id: 4,
      badge: 'Safety & First Aid Certified',
      desc: 'Completed advanced club emergency response & AED protocol.',
      icon: '🏆',
      date: 'Jan 2026'
    }
  ];

  const loadPersonalHRData = async () => {
    setLoading(true);
    try {
      const allStaff = await getStaffList();
      const userEmail = (user?.email || '').toLowerCase();
      const matched = allStaff.find(s => s.email && s.email.toLowerCase() === userEmail);

      const baseSalary = matched?.salary || (role === 'STAFF_MANAGER' ? 75000 : 45000);
      const personalStaff = matched || {
        id: user?.id || 1,
        name: user?.name || user?.email?.split('@')[0] || 'Staff Member',
        email: user?.email || 'staff@kinesis.club',
        role: role?.replace('_', ' ') || 'Staff Member',
        department: matched?.department || 'Operations',
        salary: baseSalary,
        shift: 'Morning Shift (06:00 - 15:00)',
        employment_status: 'ACTIVE'
      };

      setStaffRecord(personalStaff);

      // Load leaves and isolate to this employee
      const allLeaves = await getStaffLeaves();
      const myLeaves = allLeaves.filter(l => 
        (l.staff_name && l.staff_name.toLowerCase() === personalStaff.name.toLowerCase()) ||
        l.id === 1 // Fallback demo item for preview
      );
      setLeaves(myLeaves);
    } catch (err) {
      console.warn('Error loading staff personal HR:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonalHRData();
  }, [user]);

  const handleClockToggle = () => {
    const nextState = !clockedIn;
    setClockedIn(nextState);
    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setClockTime(nowStr);
    setFeedback({
      type: 'success',
      text: nextState ? `Clocked IN successfully at ${nowStr}. Have an energetic shift!` : `Clocked OUT successfully at ${nowStr}. Rest well!`
    });
    logAudit({
      userName: staffRecord?.name || user?.name,
      role: role || 'STAFF',
      action: nextState ? 'Clock In' : 'Clock Out',
      entity: 'Attendance',
      details: `${nextState ? 'Started' : 'Ended'} shift at ${nowStr}`
    });
  };

  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) {
      setFeedback({ type: 'error', text: 'Please specify a reason for your leave request.' });
      return;
    }
    if (leaveForm.start_date > leaveForm.end_date) {
      setFeedback({ type: 'error', text: 'End date cannot be earlier than start date.' });
      return;
    }

    const newReq = {
      id: Date.now(),
      staff_name: staffRecord?.name || user?.name || 'Staff Member',
      department: staffRecord?.department || 'Operations',
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      reason: leaveForm.reason.trim(),
      status: 'PENDING',
      approved_by: null
    };

    setLeaves([newReq, ...leaves]);
    setLeaveModalOpen(false);
    setLeaveForm({
      leave_type: 'Casual Leave',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      reason: ''
    });
    setFeedback({ type: 'success', text: 'Leave request submitted to Staff Manager for approval.' });
  };

  const handleCancelLeave = (leaveId) => {
    setLeaves(leaves.map(l => l.id === leaveId ? { ...l, status: 'CANCELLED' } : l));
    setFeedback({ type: 'success', text: 'Leave request cancelled.' });
  };

  // Salary breakdown
  const salary = staffRecord?.salary || 45000;
  const allowances = {
    hra: Math.round(salary * 0.25),
    travel: 3000,
    uniform: 2000
  };
  const bonuses = 3500;
  const deductions = {
    pf: 1800,
    tax: 200
  };
  const netSalary = salary + allowances.hra + allowances.travel + allowances.uniform + bonuses - deductions.pf - deductions.tax;

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="spin" size={24} style={{ marginBottom: '0.75rem' }} />
        <p>Loading personal HR dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Profile & Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#b45309', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            <Briefcase size={16} /> Employee Personal HR & Work Hub
          </div>
          <h1 style={{ margin: 0, fontSize: '2.2rem', color: 'var(--text-main)' }}>
            Welcome, {staffRecord?.name || user?.name || 'Staff Member'}
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Role: <strong>{staffRecord?.role}</strong> • Department: <strong>{staffRecord?.department}</strong> • Status: <span style={{ color: '#10b981', fontWeight: 700 }}>{staffRecord?.employment_status}</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Quick Clock In/Out button */}
          <button 
            onClick={handleClockToggle}
            className={`btn ${clockedIn ? 'btn-secondary' : 'btn-primary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontWeight: 700 }}
          >
            {clockedIn ? <LogOut size={16} color="#ef4444" /> : <LogIn size={16} color="#10b981" />}
            {clockedIn ? 'Clock Out Shift' : 'Clock In Shift'}
          </button>

          <CurrentDate />
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.9rem',
          background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: feedback.type === 'error' ? '#ef4444' : '#10b981',
          border: `1px solid ${feedback.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('work')}
          style={{ padding: '0.65rem 1.25rem', border: 'none', background: activeTab === 'work' ? 'var(--primary)' : 'transparent', color: activeTab === 'work' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Clock size={16} /> My Work
        </button>
        <button 
          onClick={() => setActiveTab('holidays')}
          style={{ padding: '0.65rem 1.25rem', border: 'none', background: activeTab === 'holidays' ? 'var(--primary)' : 'transparent', color: activeTab === 'holidays' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Calendar size={16} /> My Holidays
        </button>
        <button 
          onClick={() => setActiveTab('salary')}
          style={{ padding: '0.65rem 1.25rem', border: 'none', background: activeTab === 'salary' ? 'var(--primary)' : 'transparent', color: activeTab === 'salary' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <DollarSign size={16} /> My Salary
        </button>
        <button 
          onClick={() => setActiveTab('leave')}
          style={{ padding: '0.65rem 1.25rem', border: 'none', background: activeTab === 'leave' ? 'var(--primary)' : 'transparent', color: activeTab === 'leave' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Briefcase size={16} /> My Leave ({leaves.length})
        </button>
        <button 
          onClick={() => setActiveTab('achievements')}
          style={{ padding: '0.65rem 1.25rem', border: 'none', background: activeTab === 'achievements' ? 'var(--primary)' : 'transparent', color: activeTab === 'achievements' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Award size={16} /> My Achievements
        </button>
        {isStaffManager && (
          <button 
            onClick={() => setActiveTab('manager')}
            style={{ marginLeft: 'auto', padding: '0.65rem 1.25rem', border: '1px solid #b45309', background: activeTab === 'manager' ? '#b45309' : 'rgba(180, 83, 9, 0.1)', color: activeTab === 'manager' ? '#fff' : '#b45309', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Shield size={16} /> Staff Roster Management
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MY WORK */}
      {/* ======================================================== */}
      {activeTab === 'work' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Attendance Status</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: clockedIn ? '#10b981' : '#ef4444', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {clockedIn ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                {clockedIn ? 'CLOCKED IN' : 'OFF DUTY'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Last stamp: {clockTime}
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Working Shift</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.4rem' }}>
                {staffRecord?.shift || 'Morning (06:00 - 15:00)'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                8.5 Hours Schedule • 45 min Break
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Monthly Hours</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.4rem' }}>
                168 / 180 hrs
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                93.3% Target Met • 0 Overdue
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Working Days</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '0.4rem' }}>
                Monday – Friday
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Weekend Rotational Off
              </div>
            </div>
          </div>

          {/* Department Portals Access Panel */}
          <div className="card" style={{ padding: '1.75rem', background: 'var(--bg-surface)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} color="var(--primary)" /> Department Portals & Operational Desks
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Quick navigation to your assigned operational desks and club services.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div 
                onClick={() => navigate('court-dashboard')}
                className="card" 
                style={{ padding: '1.25rem', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', transition: 'all 0.2s' }}
              >
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>Court Desk</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Check-in players & e-tickets</div>
              </div>

              <div 
                onClick={() => navigate('shop-dashboard')}
                className="card" 
                style={{ padding: '1.25rem', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)' }}
              >
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#10b981' }}>Gear Shop</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Orders & equipment pick-up</div>
              </div>

              <div 
                onClick={() => navigate('restaurant-dashboard')}
                className="card" 
                style={{ padding: '1.25rem', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)' }}
              >
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#b45309' }}>Restaurant</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Dining floor & kitchen orders</div>
              </div>

              <div 
                onClick={() => navigate('bar-dashboard')}
                className="card" 
                style={{ padding: '1.25rem', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)' }}
              >
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#d97706' }}>Bar & Lounge</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Beverage orders & cellar stock</div>
              </div>

              <div 
                onClick={() => navigate('reception-dashboard')}
                className="card" 
                style={{ padding: '1.25rem', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)' }}
              >
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#3b82f6' }}>Reception Desk</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Front-desk POS & bookings</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MY HOLIDAYS */}
      {/* ======================================================== */}
      {activeTab === 'holidays' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Kinesis Sports Club Holiday Calendar (2026)</h3>
          <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Official gazetted and club holidays with full pay entitlement.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Holiday Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Classification</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Benefit Status</th>
                </tr>
              </thead>
              <tbody>
                {clubHolidays.map((h, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{h.date}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{h.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{h.type}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                        PAID HOLIDAY
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
      {/* TAB 3: MY SALARY (STRICTLY PRIVATE) */}
      {/* ======================================================== */}
      {activeTab === 'salary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          <div style={{ background: 'rgba(180, 83, 9, 0.08)', border: '1px solid rgba(180, 83, 9, 0.2)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield size={20} color="#b45309" />
            <div style={{ fontSize: '0.88rem', color: '#b45309' }}>
              <strong>Confidential Information:</strong> This salary record is private to your employee account (ID: #{staffRecord?.id}).
            </div>
          </div>

          {/* Salary Breakdown Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            <div className="card" style={{ padding: '1.75rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Earnings & Allowances</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Basic Salary:</span>
                  <strong>₹{salary.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>House Rent Allowance (HRA):</span>
                  <strong>₹{allowances.hra.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Travel & Commute:</span>
                  <strong>₹{allowances.travel.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Uniform & Nutrition:</span>
                  <strong>₹{allowances.uniform.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>Performance Incentive:</span>
                  <strong>+₹{bonuses.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.75rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Deductions & Statutory</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                  <span>Provident Fund (PF):</span>
                  <strong>-₹{deductions.pf.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                  <span>Professional Tax:</span>
                  <strong>-₹{deductions.tax.toLocaleString()}</strong>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0.5rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                  <span>Net Disbursed Salary:</span>
                  <span style={{ color: 'var(--primary)' }}>₹{netSalary.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                  <CheckCircle2 size={16} /> Disbursed on 1st of month via Direct HDFC Transfer
                </div>
              </div>
            </div>

          </div>

          {/* Payslips Table */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Recent Payslip Records</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Month</th>
                    <th style={{ padding: '0.75rem' }}>Gross Pay</th>
                    <th style={{ padding: '0.75rem' }}>Net Pay</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Document</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { month: 'September 2026', gross: salary + allowances.hra + allowances.travel + allowances.uniform + bonuses, net: netSalary, status: 'PAID' },
                    { month: 'August 2026', gross: salary + allowances.hra + allowances.travel + allowances.uniform + 2500, net: netSalary - 1000, status: 'PAID' },
                    { month: 'July 2026', gross: salary + allowances.hra + allowances.travel + allowances.uniform + 3000, net: netSalary - 500, status: 'PAID' }
                  ].map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.85rem', fontWeight: 600 }}>{p.month}</td>
                      <td style={{ padding: '0.85rem' }}>₹{p.gross.toLocaleString()}</td>
                      <td style={{ padding: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>₹{p.net.toLocaleString()}</td>
                      <td style={{ padding: '0.85rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => setFeedback({ type: 'success', text: `Payslip for ${p.month} generated.` })} 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Download size={13} /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: MY LEAVE */}
      {/* ======================================================== */}
      {activeTab === 'leave' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Leave Balances Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Annual Paid Leave</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>14 / 18</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Days Remaining</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Medical / Sick Leave</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>8 / 10</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Days Remaining</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Casual Leave</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>5 / 6</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Days Remaining</div>
            </div>
          </div>

          {/* Action Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>My Leave History & Requests</h3>
            <button 
              onClick={() => setLeaveModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem' }}
            >
              <Plus size={16} /> Apply For Leave
            </button>
          </div>

          {/* Leaves Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {leaves.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>Leave Type</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Duration</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Reason</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{l.leave_type}</td>
                        <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          {l.start_date} → {l.end_date}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{l.reason}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            background: l.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : l.status === 'PENDING' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: l.status === 'APPROVED' ? '#10b981' : l.status === 'PENDING' ? '#f59e0b' : '#ef4444'
                          }}>
                            {l.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          {l.status === 'PENDING' ? (
                            <button 
                              onClick={() => handleCancelLeave(l.id)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#ef4444' }}
                            >
                              Cancel
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No leave requests filed yet. Click "Apply For Leave" to submit a request.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: MY ACHIEVEMENTS */}
      {/* ======================================================== */}
      {activeTab === 'achievements' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {achievements.map((ach) => (
            <div key={ach.id} className="card" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{ach.icon}</div>
              <h3 style={{ margin: '0 0 0.35rem 0' }}>{ach.badge}</h3>
              <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                {ach.desc}
              </p>
              <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>
                Conferred: {ach.date}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: STAFF MANAGER VIEW (FOR STAFF_MANAGER / ADMIN ONLY) */}
      {/* ======================================================== */}
      {activeTab === 'manager' && isStaffManager && (
        <div style={{ marginTop: '0.5rem' }}>
          <StaffManagerPortal navigate={navigate} />
        </div>
      )}

      {/* ======================================================== */}
      {/* APPLY LEAVE MODAL */}
      {/* ======================================================== */}
      {leaveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>Apply For Staff Leave</h3>
              <button onClick={() => setLeaveModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Leave Type</label>
                <select 
                  value={leaveForm.leave_type} 
                  onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Medical Leave">Medical Leave</option>
                  <option value="Annual Leave">Annual Paid Leave</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Start Date</label>
                  <input 
                    type="date" 
                    required 
                    value={leaveForm.start_date} 
                    onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>End Date</label>
                  <input 
                    type="date" 
                    required 
                    value={leaveForm.end_date} 
                    onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>Reason for Leave</label>
                <textarea 
                  required
                  rows={3} 
                  placeholder="e.g. Attending family wedding / Medical recovery..." 
                  value={leaveForm.reason} 
                  onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setLeaveModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
