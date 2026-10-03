import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { useAuth } from '../../AuthContext.jsx';
import { checkCourtAvailability, createBooking, calculateBookingPrice } from '@backend/services/bookingService.js';

export default function BookCourt({ navigate }) {
  const { memberProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [sport, setSport] = useState('Tennis');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [time, setTime] = useState('');
  const [priceInfo, setPriceInfo] = useState(null);
  const [error, setError] = useState('');
  
  const timeSlots = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];

  useEffect(() => {
    supabase.from('courts').select('*').eq('sport', sport).then(({ data }) => setCourts(data || []));
  }, [sport]);

  const handleSelectCourt = (c) => {
    setSelectedCourt(c);
    setStep(4);
  };

  const handleSelectTime = async (t) => {
    setTime(t);
    const end = `${parseInt(t.split(':')[0]) + 1}:${t.split(':')[1]}`;
    
    const avail = await checkCourtAvailability(selectedCourt.id, date, t, end);
    if (!avail.available) {
      setError(avail.reason || 'Slot not available');
      return;
    }
    setError('');
    
    const price = await calculateBookingPrice(selectedCourt.id, memberProfile?.id);
    setPriceInfo(price);
    
    setStep(5);
  };

  const handleConfirm = async () => {
    try {
      const end = `${parseInt(time.split(':')[0]) + 1}:${time.split(':')[1]}`;
      await createBooking({
        member_id: memberProfile.id,
        court_id: selectedCourt.id,
        booking_date: date,
        start_time: time,
        end_time: end
      });
      navigate('bookings');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px' }}>
      <button onClick={() => navigate('home')} className="btn btn-secondary" style={{ marginBottom: '2rem', border: 'none', paddingLeft: 0 }}>&larr; Back to Home</button>
      
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Book a Court</h1>
      
      {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '2rem' }}>{error}</div>}

      {step === 1 && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 1: Choose Sport</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => { setSport('Tennis'); setStep(2); }} className="btn btn-secondary" style={{ flex: 1, padding: '1.5rem' }}>Tennis</button>
            <button onClick={() => { setSport('Cricket'); setStep(2); }} className="btn btn-secondary" style={{ flex: 1, padding: '1.5rem' }}>Cricket</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 2: Choose Court</h3>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>Change Sport</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {courts.map(c => (
              <div key={c.id} onClick={() => { setSelectedCourt(c); setStep(3); }} style={{ border: '1px solid var(--border-subtle)', padding: '1.5rem', borderRadius: 'var(--radius-md)', cursor: c.status === 'available' ? 'pointer' : 'not-allowed', background: 'var(--bg-surface)', opacity: c.status === 'available' ? 1 : 0.6 }}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{c.name}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>${c.hourly_rate}/hr</span>
                  <span style={{ fontSize: '0.8rem', color: c.status === 'available' ? 'var(--primary)' : '#ef4444', textTransform: 'uppercase', fontWeight: 600 }}>{c.status}</span>
                </div>
              </div>
            ))}
            {courts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No courts available for {sport}.</p>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 3: Choose Date and Time</h3>
            <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>Change Court</button>
          </div>
          <input type="date" min={new Date().toISOString().split('T')[0]} value={date} onChange={e => setDate(e.target.value)} className="form-input" style={{ maxWidth: '300px', marginBottom: '2rem' }} />
          
          <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Available Slots (1 hour)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
            {timeSlots.map(t => (
              <button key={t} onClick={() => handleSelectTime(t)} className="btn btn-secondary">{t}</button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 4: Confirmation</h3>
            <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>Change Time</button>
          </div>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem', fontSize: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Sport</span> <strong>{sport}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Court</span> <strong>{selectedCourt?.name}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Date</span> <strong>{new Date(date).toLocaleDateString()}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Time</span> <strong>{time} - {parseInt(time.split(':')[0]) + 1}:{time.split(':')[1]}</strong></div>
            
            <div style={{ margin: '1rem 0', borderTop: '1px solid var(--border-subtle)' }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Base Price</span> <strong>${selectedCourt?.hourly_rate || 0}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}><span style={{ color: 'var(--primary)' }}>Membership Discount</span> <strong>-{priceInfo?.discountPercent}%</strong></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem' }}><span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Final Price</span> <strong style={{ fontSize: '1.5rem' }}>${priceInfo?.finalPrice}</strong></div>
          </div>
          <button onClick={handleConfirm} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>Confirm Booking</button>
        </div>
      )}
    </div>
  );
}
