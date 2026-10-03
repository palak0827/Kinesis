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
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 1: Select Sport</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => { setSport('Tennis'); setStep(2); }} className="btn btn-secondary" style={{ flex: 1, padding: '1.5rem' }}>Tennis</button>
            <button onClick={() => { setSport('Cricket'); setStep(2); }} className="btn btn-secondary" style={{ flex: 1, padding: '1.5rem' }}>Cricket</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 2: Select Date</h3>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" style={{ maxWidth: '300px', marginBottom: '1.5rem' }} />
          <br/>
          <button onClick={() => setStep(3)} className="btn btn-primary">Continue</button>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 3: Select Court</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {courts.map(c => (
              <div key={c.id} onClick={() => handleSelectCourt(c)} style={{ border: '1px solid var(--border-subtle)', padding: '1.5rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'var(--bg-surface)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{c.name}</h4>
                <span style={{ fontSize: '0.8rem', color: c.status === 'available' ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'uppercase' }}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 4: Select Time</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
            {timeSlots.map(t => (
              <button key={t} onClick={() => handleSelectTime(t)} className="btn btn-secondary">{t}</button>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Booking Summary</h3>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem', fontSize: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Court</span> <strong>{selectedCourt.name}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Date</span> <strong>{date}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Time</span> <strong>{time} - {parseInt(time.split(':')[0]) + 1}:{time.split(':')[1]}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Discount applied</span> <strong>{priceInfo?.discountPercent}%</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem' }}><span style={{ color: 'var(--text-muted)' }}>Final Price</span> <strong style={{ fontSize: '1.5rem' }}>${priceInfo?.finalPrice}</strong></div>
          </div>
          <button onClick={handleConfirm} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>Confirm Booking</button>
        </div>
      )}
    </div>
  );
}
