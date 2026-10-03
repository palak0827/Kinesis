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
    <div className="page-wrapper" style={{ maxWidth: '1000px', padding: 0 }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Good morning, {memberProfile?.name?.split(' ')[0]}</h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>Ready for your next game?</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        
        {/* Quick Actions & Booking */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Next Booking</h3>
            {upcomingBooking ? (
              <div>
                <h2 style={{ marginBottom: '0.25rem' }}>{upcomingBooking.courts?.name || 'Court'}</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  {new Date(upcomingBooking.booking_date).toLocaleDateString()} • {upcomingBooking.start_time.slice(0,5)} - {upcomingBooking.end_time.slice(0,5)}
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => navigate('bookings')} className="btn btn-secondary">View Details</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>No upcoming bookings.</p>
                <button onClick={() => navigate('book')} className="btn btn-primary">Book Court</button>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button onClick={() => navigate('book')} className="btn btn-secondary" style={{ padding: '1rem' }}>Book Court</button>
              <button onClick={() => navigate('bookings')} className="btn btn-secondary" style={{ padding: '1rem' }}>My Bookings</button>
            </div>
          </div>
        </div>

        {/* Membership Summary */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Membership</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Status</span>
            <span style={{ 
              color: memberProfile?.status === 'active' ? '#10b981' : '#ef4444', 
              fontWeight: 'bold', 
              textTransform: 'uppercase',
              fontSize: '0.85rem',
              padding: '2px 8px',
              background: memberProfile?.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              borderRadius: 'var(--radius-sm)'
            }}>
              {memberProfile?.status || 'Unknown'}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Current Plan</span>
            <span style={{ fontWeight: 600 }}>{memberProfile?.membership_plans?.name || 'Standard'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Valid Until</span>
            <span style={{ fontWeight: 500 }}>{memberProfile?.expiry_date ? new Date(memberProfile.expiry_date).toLocaleDateString() : 'N/A'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Daily Booking Limit</span>
            <span style={{ fontWeight: 500 }}>{memberProfile?.membership_plans?.daily_booking_limit || 1} / day</span>
          </div>

          <button onClick={() => navigate('membership')} className="btn btn-secondary" style={{ width: '100%', border: 'none', background: 'var(--border-subtle)' }}>View Benefits</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Recent Personal Activity</h3>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No recent activity to show.</p>
      </div>
    </div>
  );
}
