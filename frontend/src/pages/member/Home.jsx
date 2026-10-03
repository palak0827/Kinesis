import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { getBookings } from '@backend/services/bookingService.js';

export default function MemberHome({ navigate }) {
  const { memberProfile, logout } = useAuth();
  const [upcomingBooking, setUpcomingBooking] = useState(null);

  useEffect(() => {
    if (memberProfile?.id) {
      getBookings({ member_id: memberProfile.id }).then(bookings => {
        const upcoming = bookings
          .filter(b => b.status === 'confirmed' && new Date(`${b.booking_date}T${b.start_time}`) > new Date())
          .sort((a, b) => new Date(`${a.booking_date}T${a.start_time}`) - new Date(`${b.booking_date}T${b.start_time}`));
        if (upcoming.length > 0) setUpcomingBooking(upcoming[0]);
      });
    }
  }, [memberProfile]);

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Good morning, {memberProfile?.name?.split(' ')[0]}</h1>
      
      <div style={{ display: 'inline-block', padding: '4px 12px', background: 'var(--accent-gold)', color: '#fff', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3rem' }}>
        {memberProfile?.membership_plans?.name || 'Standard'} Member
      </div>

      <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Next Booking</h3>
        {upcomingBooking ? (
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>{upcomingBooking.courts?.name || 'Court'}</h2>
            <p style={{ color: 'var(--text-muted)' }}>{upcomingBooking.booking_date} • {upcomingBooking.start_time} - {upcomingBooking.end_time}</p>
            <button onClick={() => navigate('bookings')} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>View Booking</button>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>You have no upcoming bookings.</p>
        )}
      </div>

      <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Quick Actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <button onClick={() => navigate('book')} className="card" style={{ textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <h4 style={{ margin: 0 }}>Book Court</h4>
        </button>
        <button onClick={() => navigate('bookings')} className="card" style={{ textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <h4 style={{ margin: 0 }}>My Bookings</h4>
        </button>
        <button className="card" style={{ textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <h4 style={{ margin: 0 }}>Membership</h4>
        </button>
        <button className="card" style={{ textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <h4 style={{ margin: 0 }}>Shop</h4>
        </button>
      </div>

      <button onClick={logout} className="btn btn-secondary" style={{ color: '#ef4444', borderColor: 'transparent' }}>Logout</button>
    </div>
  );
}
