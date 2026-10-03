import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { getBookings, cancelBooking } from '@backend/services/bookingService.js';
import CourtETicket from '../../components/CourtETicket.jsx';
import { Ticket } from 'lucide-react';

export default function MemberBookings({ navigate }) {
  const { memberProfile } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [cancelled, setCancelled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedTicketBooking, setSelectedTicketBooking] = useState(null);

  const fetchBookings = async () => {
    if (!memberProfile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const all = await getBookings({ member_id: memberProfile.id });

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

      // A booking is upcoming if date is in future, or today and its end time has not passed yet
      setUpcoming(
        (all || []).filter((b) => {
          if (b.status !== 'confirmed') return false;
          if (b.booking_date > todayStr) return true;
          if (b.booking_date === todayStr) {
            const endTime = b.end_time?.length === 5 ? `${b.end_time}:00` : (b.end_time || '23:59:59');
            return endTime >= currentTimeStr;
          }
          return false;
        })
      );

      // A booking is past if date is in past, or today and its end time has already elapsed
      setPast(
        (all || []).filter((b) => {
          if (b.status !== 'confirmed' && b.status !== 'completed') return false;
          if (b.booking_date < todayStr) return true;
          if (b.booking_date === todayStr) {
            const endTime = b.end_time?.length === 5 ? `${b.end_time}:00` : (b.end_time || '00:00:00');
            return endTime < currentTimeStr;
          }
          return false;
        })
      );

      setCancelled((all || []).filter((b) => b.status === 'cancelled'));
    } catch (err) {
      console.error('Error fetching member bookings:', err);
      setError(err.message || 'Unable to load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [memberProfile?.id]);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      setCancellingId(id);
      await cancelBooking(id);
      await fetchBookings();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  const renderBookingCard = (b, canCancel) => (
    <div
      key={b.id}
      className="card"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeft: b.status === 'cancelled' ? '4px solid #ef4444' : canCancel ? '4px solid var(--primary)' : '4px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        padding: '1.25rem 1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}
    >
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          {b.courts?.sport || 'Racquet Sports'} • Ticket #KSC-BKG-{String(b.id).padStart(4, '0')}
        </div>
        <h4 style={{ fontSize: '1.2rem', margin: '0 0 0.25rem 0' }}>{b.courts?.name}</h4>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
          {new Date(b.booking_date).toLocaleDateString()} • {b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)} (1 hr)
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            ₹{Number(b.price || 0).toFixed(2)}
          </div>
          <span style={{ color: b.status === 'confirmed' ? '#10b981' : b.status === 'cancelled' ? '#ef4444' : 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>
            {b.status}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Phase 11: View Ticket Button */}
          <button
            onClick={() => setSelectedTicketBooking(b)}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Ticket size={14} />
            <span>View Ticket</span>
          </button>

          {canCancel && (
            <button
              onClick={() => handleCancel(b.id)}
              disabled={cancellingId === b.id}
              className="btn btn-secondary"
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              {cancellingId === b.id ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>Loading your bookings...</div>;
    }

    if (error) {
      return (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
          ✕ {error}
        </div>
      );
    }

    if (activeTab === 'upcoming') {
      if (upcoming.length === 0) {
        return (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>No upcoming bookings.</p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Book your next session and get on court.</p>
            <button onClick={() => navigate('book')} className="btn btn-primary">Book a Court</button>
          </div>
        );
      }
      return <div style={{ display: 'grid', gap: '1rem' }}>{upcoming.map((b) => renderBookingCard(b, true))}</div>;
    }

    if (activeTab === 'past') {
      if (past.length === 0) {
        return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem 0' }}>No past bookings found.</p>;
      }
      return <div style={{ display: 'grid', gap: '1rem' }}>{past.map((b) => renderBookingCard(b, false))}</div>;
    }

    if (activeTab === 'cancelled') {
      if (cancelled.length === 0) {
        return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem 0' }}>No cancelled bookings.</p>;
      }
      return <div style={{ display: 'grid', gap: '1rem' }}>{cancelled.map((b) => renderBookingCard(b, false))}</div>;
    }

    return null;
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>My Court Bookings</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Manage court schedule, access confirmed digital e-tickets, and view history.
          </p>
        </div>
        <button onClick={() => navigate('book')} className="btn btn-primary">
          + New Booking
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'upcoming' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'upcoming' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            padding: '0.75rem 0.5rem',
            cursor: 'pointer'
          }}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'past' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'past' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            padding: '0.75rem 0.5rem',
            cursor: 'pointer'
          }}
        >
          Past ({past.length})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'cancelled' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'cancelled' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            padding: '0.75rem 0.5rem',
            cursor: 'pointer'
          }}
        >
          Cancelled ({cancelled.length})
        </button>
      </div>

      {renderContent()}

      {/* DIGITAL COURT E-TICKET MODAL (Phase 11) */}
      {selectedTicketBooking && (
        <CourtETicket
          booking={{
            ...selectedTicketBooking,
            members: memberProfile
          }}
          onClose={() => setSelectedTicketBooking(null)}
        />
      )}
    </div>
  );
}
