import React, { useState, useEffect } from 'react';
import { getCourts, getBookings, cancelBooking, updateCourtStatus } from '@backend/services/bookingService.js';
import { getCourtRevenueStats } from '@backend/services/revenueService.js';
import { supabase } from '@backend/services/supabaseClient.js';
import { verifyAndCheckInTicket, logAudit } from '../../services/clubPlatformService.js';
import {
  Trophy, Calendar, Clock, CheckCircle2, AlertTriangle, ShieldCheck,
  RefreshCw, Search, Check, X, QrCode, User, MapPin
} from 'lucide-react';

export default function CourtManagerPortal({ navigate }) {
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'courts' | 'verify'
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalCourts: 0,
    availableCourts: 0,
    bookedCourts: 0,
    maintenanceCourts: 0,
    todayBookings: 0,
    upcomingBookings: 0,
    cancelledBookings: 0,
    todayRevenue: 0
  });
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSport, setSelectedSport] = useState('All');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Ticket Verification Form state
  const [ticketQuery, setTicketQuery] = useState('');
  const [verifiedResult, setVerifiedResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const loadCourtData = async () => {
    setLoading(true);
    try {
      const [allCourts, allBookings, revStats] = await Promise.all([
        getCourts(),
        getBookings(),
        getCourtRevenueStats()
      ]);

      setCourts(allCourts || []);
      setBookings(allBookings || []);

      const today = new Date().toISOString().split('T')[0];
      const todayBkgs = (allBookings || []).filter(b => b.booking_date === today && b.status !== 'cancelled');
      const cancBkgs = (allBookings || []).filter(b => b.status === 'cancelled');
      const upcomingBkgs = (allBookings || []).filter(b => b.booking_date >= today && b.status === 'confirmed');

      const maintCourts = (allCourts || []).filter(c => c.status === 'maintenance').length;
      const availCourts = (allCourts || []).filter(c => c.status === 'available').length;

      setStats({
        totalCourts: allCourts?.length || 0,
        availableCourts: availCourts,
        bookedCourts: todayBkgs.length,
        maintenanceCourts: maintCourts,
        todayBookings: todayBkgs.length,
        upcomingBookings: upcomingBkgs.length,
        cancelledBookings: cancBkgs.length,
        todayRevenue: revStats?.todayCourtRevenue || 0
      });
    } catch (err) {
      console.warn('Failed loading court manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourtData();
  }, []);

  const handleToggleMaintenance = async (courtId, currentStatus) => {
    const newStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
    try {
      await updateCourtStatus(courtId, newStatus);
      setFeedback({ type: 'success', text: `Court status updated to ${newStatus}.` });
      logAudit({ userName: 'Vikramaditya Rao', role: 'COURT_MANAGER', action: 'Court Status Updated', entity: 'Court', entityId: courtId, details: `Status set to ${newStatus}` });
      await loadCourtData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed updating court status.' });
    }
  };

  const handleVerifyTicket = async (e) => {
    e.preventDefault();
    if (!ticketQuery.trim()) return;
    setVerifying(true);
    setVerifiedResult(null);
    setFeedback(null);

    try {
      const res = await verifyAndCheckInTicket(ticketQuery.trim());
      setVerifiedResult(res);
      setFeedback({ type: 'success', text: res.message });
      await loadCourtData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Ticket verification failed.' });
    } finally {
      setVerifying(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesDate = !dateFilter || b.booking_date === dateFilter;
    const matchesSport = selectedSport === 'All' || (b.courts?.sport || '').toLowerCase() === selectedSport.toLowerCase();
    return matchesDate && matchesSport;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            <Trophy size={16} /> Court Operations & Scheduling Portal
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-main)' }}>Court Management & E-Ticket Desk</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time court availability, booking calendar, collision prevention, and digital ticket check-in.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setActiveTab('verify')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem' }}>
            <QrCode size={16} /> Scan / Verify Ticket
          </button>
          <button onClick={loadCourtData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
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

      {/* KPIs Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Available Courts</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{stats.availableCourts}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of {stats.totalCourts} Total Facilities</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Today's Bookings</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.25rem' }}>{stats.todayBookings}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confirmed reservations</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Upcoming Games</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>{stats.upcomingBookings}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In future schedule</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Maintenance</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>{stats.maintenanceCourts}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blocked from booking</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #d4af37' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Court Revenue</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#b45309', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
            ₹{stats.todayRevenue.toFixed(0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Today's Booking Total</div>
        </div>
      </div>

      {/* Subtabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('bookings')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'bookings' ? 'var(--primary)' : 'transparent', color: activeTab === 'bookings' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Bookings Calendar ({bookings.length})
        </button>
        <button 
          onClick={() => setActiveTab('courts')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'courts' ? 'var(--primary)' : 'transparent', color: activeTab === 'courts' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Court Status & Maintenance ({courts.length})
        </button>
        <button 
          onClick={() => setActiveTab('verify')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'verify' ? 'var(--primary)' : 'transparent', color: activeTab === 'verify' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Scan / Verify E-Ticket
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: BOOKING CALENDAR & CLASH CHECK */}
      {/* ======================================================== */}
      {activeTab === 'bookings' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input 
                type="date" 
                value={dateFilter} 
                onChange={e => setDateFilter(e.target.value)} 
                className="form-input" 
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              />
              <select 
                value={selectedSport} 
                onChange={e => setSelectedSport(e.target.value)}
                className="form-input"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              >
                <option value="All">All Sports</option>
                <option value="Tennis">Tennis</option>
                <option value="Cricket">Cricket</option>
                <option value="Badminton">Badminton</option>
                <option value="Squash">Squash</option>
                <option value="Padel">Padel</option>
              </select>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filteredBookings.length} court reservations
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Ticket / Booking ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Player / Guest</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Court & Sport</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Schedule Time</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Price</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Check-in Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(b => {
                  const isCheckedIn = b.check_in_status === 'CHECKED_IN';
                  const isCancelled = b.status === 'cancelled';
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                          {b.ticket_id || `#KSC-BKG-${String(b.id).padStart(4, '0')}`}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>BKG #{b.id}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{b.members?.name || 'Walk-In Customer'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {b.members?.membership_plans?.name ? `${b.members.membership_plans.name} Member` : 'Walk-In Guest'}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{b.courts?.name || `Court #${b.court_id}`}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.courts?.sport}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{b.booking_date}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        ₹{Number(b.price).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        {isCancelled ? (
                          <span style={{ background: '#ef4444', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                            CANCELLED
                          </span>
                        ) : isCheckedIn ? (
                          <span style={{ background: '#10b981', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                            CHECKED IN
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                            CONFIRMED
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        {!isCancelled && !isCheckedIn && (
                          <button
                            onClick={async () => {
                              await verifyAndCheckInTicket(b.ticket_id || String(b.id));
                              await loadCourtData();
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            Check In
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

      {/* ======================================================== */}
      {/* VIEW 2: COURT STATUS & MAINTENANCE TOGGLE */}
      {/* ======================================================== */}
      {activeTab === 'courts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {courts.map(c => {
            const isMaint = c.status === 'maintenance';
            return (
              <div key={c.id} className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', borderTop: isMaint ? '4px solid #ef4444' : '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.15rem' }}>{c.name}</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sport: {c.sport}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '999px', background: isMaint ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: isMaint ? '#ef4444' : '#10b981', textTransform: 'uppercase' }}>
                    {c.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Rate per 30-min: <strong>₹{Number(c.hourly_rate).toFixed(2)}</strong>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <button
                    onClick={() => handleToggleMaintenance(c.id, c.status)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: isMaint ? '#10b981' : '#ef4444',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    {isMaint ? 'Return to Available' : 'Put Under Maintenance'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: SCAN & VERIFY E-TICKET */}
      {/* ======================================================== */}
      {activeTab === 'verify' && (
        <div className="card" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(22, 43, 35, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
              <QrCode size={26} />
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.35rem 0' }}>Scan or Verify Court E-Ticket</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Enter the customer's unique ticket code (e.g. KIN-CT-20261004-0001, KSC-BKG-0001, or Booking ID).
            </p>
          </div>

          <form onSubmit={handleVerifyTicket} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              required
              placeholder="Enter Ticket ID (e.g. KIN-CT-... or KSC-BKG-...)"
              value={ticketQuery} 
              onChange={e => setTicketQuery(e.target.value)} 
              className="form-input" 
              style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}
            />
            <button 
              type="submit" 
              disabled={verifying}
              className="btn btn-primary" 
              style={{ padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.95rem' }}
            >
              {verifying ? 'Checking...' : 'Verify Ticket'}
            </button>
          </form>

          {/* Verification Result Card */}
          {verifiedResult && verifiedResult.booking && (
            <div style={{
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              border: '2px solid #10b981',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 800, fontSize: '1.05rem', marginBottom: '1rem' }}>
                <CheckCircle2 size={20} />
                <span>Ticket Confirmed & Checked In!</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Player</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{verifiedResult.booking.members?.name || 'Walk-in Guest'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{verifiedResult.booking.members?.email}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Assigned Court</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{verifiedResult.booking.courts?.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sport: {verifiedResult.booking.courts?.sport}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Date & Time</div>
                  <div style={{ fontWeight: 700 }}>{verifiedResult.booking.booking_date}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {verifiedResult.booking.start_time?.slice(0, 5)} – {verifiedResult.booking.end_time?.slice(0, 5)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Ticket Code</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {verifiedResult.booking.ticket_id || `#KSC-BKG-${verifiedResult.booking.id}`}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>STATUS: CHECKED_IN</div>
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={16} />
                <span>Player is authorized to proceed to <strong>{verifiedResult.booking.courts?.name}</strong>.</span>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
