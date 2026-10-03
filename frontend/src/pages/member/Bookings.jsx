import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { getBookings, cancelBooking } from '@backend/services/bookingService.js';

export default function MemberBookings({ navigate }) {
  const { memberProfile } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, [memberProfile]);

  const fetchBookings = async () => {
    if (!memberProfile) return;
    const all = await getBookings({ member_id: memberProfile.id });
    const now = new Date();
    
    setUpcoming(all.filter(b => b.status === 'confirmed' && new Date(`${b.booking_date}T${b.start_time}`) >= now));
    setPast(all.filter(b => b.status !== 'confirmed' || new Date(`${b.booking_date}T${b.start_time}`) < now));
  };

  const handleCancel = async (id) => {
    await cancelBooking(id);
    fetchBookings();
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>My Bookings</h1>
        <button onClick={() => navigate('book')} className="btn btn-primary">Book Court</button>
      </div>

      <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upcoming</h3>
      {upcoming.length === 0 && <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>No upcoming bookings.</p>}
      <div style={{ display: 'grid', gap: '1rem', marginBottom: '4rem' }}>
        {upcoming.map(b => (
          <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--primary)' }}>
            <div>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{b.courts?.name}</h4>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>{b.booking_date} • {b.start_time} - {b.end_time}</p>
            </div>
            <div>
              <span style={{ display: 'inline-block', marginRight: '1rem', color: 'var(--primary)', fontWeight: '600' }}>Confirmed</span>
              <button onClick={() => handleCancel(b.id)} className="btn btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Cancel</button>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Past & Cancelled</h3>
      {past.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No past bookings.</p>}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {past.map(b => (
          <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7, background: 'var(--bg-main)' }}>
            <div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>{b.courts?.name}</h4>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>{b.booking_date} • {b.start_time} - {b.end_time}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold' }}>{b.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
