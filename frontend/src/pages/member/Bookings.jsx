import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { getBookings, cancelBooking } from '@backend/services/bookingService.js';

export default function MemberBookings({ navigate }) {
  const { memberProfile } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [cancelled, setCancelled] = useState([]);

  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    fetchBookings();
  }, [memberProfile]);

  const fetchBookings = async () => {
    if (!memberProfile) return;
    const all = await getBookings({ member_id: memberProfile.id });
    const now = new Date();
    
    setUpcoming(all.filter(b => b.status === 'confirmed' && new Date(`${b.booking_date}T${b.start_time}`) >= now));
    setPast(all.filter(b => (b.status === 'confirmed' || b.status === 'completed') && new Date(`${b.booking_date}T${b.start_time}`) < now));
    setCancelled(all.filter(b => b.status === 'cancelled'));
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      await cancelBooking(id);
      fetchBookings();
    }
  };

  const renderBookingCard = (b, canCancel) => (
    <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: canCancel ? '4px solid var(--primary)' : '4px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{b.courts?.sport || 'Sport'}</div>
        <h4 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{b.courts?.name}</h4>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          {new Date(b.booking_date).toLocaleDateString()} • {b.start_time.slice(0,5)} - {b.end_time.slice(0,5)}
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>${b.price}</div>
        {canCancel ? (
          <button onClick={() => handleCancel(b.id)} className="btn btn-secondary" style={{ color: '#ef4444', borderColor: 'transparent', padding: '0.25rem 0.5rem' }}>Cancel Booking</button>
        ) : (
          <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 600 }}>{b.status}</span>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'upcoming') {
      if (upcoming.length === 0) return (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>No upcoming bookings.</p>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Book your next session and get on court.</p>
          <button onClick={() => navigate('book')} className="btn btn-primary">Book a Court</button>
        </div>
      );
      return <div style={{ display: 'grid', gap: '1rem' }}>{upcoming.map(b => renderBookingCard(b, true))}</div>;
    }
    if (activeTab === 'past') {
      if (past.length === 0) return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem 0' }}>No past bookings found.</p>;
      return <div style={{ display: 'grid', gap: '1rem' }}>{past.map(b => renderBookingCard(b, false))}</div>;
    }
    if (activeTab === 'cancelled') {
      if (cancelled.length === 0) return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem 0' }}>No cancelled bookings found.</p>;
      return <div style={{ display: 'grid', gap: '1rem' }}>{cancelled.map(b => renderBookingCard(b, false))}</div>;
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>My Bookings</h1>
        <button onClick={() => navigate('book')} className="btn btn-primary">Book Court</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
        {['upcoming', 'past', 'cancelled'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', padding: '1rem 0',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: activeTab === tab ? 600 : 400,
              textTransform: 'capitalize', fontSize: '1rem', marginRight: '1.5rem'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
}
