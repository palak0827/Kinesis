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
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const timeSlots = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];

  useEffect(() => {
    supabase
      .from('courts')
      .select('*')
      .eq('sport', sport)
      .then(({ data }) => setCourts(data || []));
  }, [sport]);

  const handleSelectCourt = (c) => {
    if (c.status !== 'available') {
      setError(`Court "${c.name}" is currently under ${c.status}. Please select another court.`);
      return;
    }
    setError('');
    setSelectedCourt(c);
    setStep(3);
  };

  const handleSelectTime = async (t) => {
    setError('');
    setTime(t);
    const [h, m] = t.split(':').map(Number);
    const end = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const avail = await checkCourtAvailability(selectedCourt.id, date, t, end);
    if (!avail.available) {
      setError(avail.reason || 'Slot not available');
      return;
    }

    const price = await calculateBookingPrice(selectedCourt.id, memberProfile?.id);
    setPriceInfo(price);

    // Transition to Step 4 (Confirmation review)
    setStep(4);
  };

  const handleConfirm = async () => {
    setError('');
    setSuccessMessage('');

    // Step 4 Verification: Member ID check
    if (!memberProfile?.id) {
      setError('Unable to identify the current member. Please log in again.');
      return;
    }

    if (!selectedCourt?.id) {
      setError('Selected court is invalid. Please choose a court again.');
      return;
    }

    if (!date || !time) {
      setError('Please select a valid date and time slot.');
      return;
    }

    try {
      setSubmitting(true);
      const [h, m] = time.split(':').map(Number);
      const end = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      await createBooking({
        memberId: memberProfile.id,
        courtId: selectedCourt.id,
        bookingDate: date,
        startTime: time,
        endTime: end
      });

      setSuccessMessage('Booking confirmed successfully! Redirecting to My Bookings...');
      setTimeout(() => {
        navigate('bookings');
      }, 700);
    } catch (err) {
      console.error('Booking confirmation error:', err);
      setError(err.message || 'Unable to create booking. Please try again.');
      setSubmitting(false);
    }
  };

  const calculateEndTime = (startStr) => {
    if (!startStr) return '';
    const [h, m] = startStr.split(':').map(Number);
    return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px' }}>
      <button onClick={() => navigate('home')} className="btn btn-secondary" style={{ marginBottom: '2rem', border: 'none', paddingLeft: 0 }}>
        &larr; Back to Home
      </button>

      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Book a Court</h1>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '2rem' }}>
          ✕ {error}
        </div>
      )}

      {successMessage && (
        <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '2rem' }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Step 1: Choose Sport */}
      {step === 1 && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 1: Choose Sport</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => { setSport('Tennis'); setStep(2); }} className="btn btn-secondary" style={{ flex: 1, padding: '1.5rem', fontSize: '1.1rem' }}>
              🎾 Tennis
            </button>
            <button onClick={() => { setSport('Cricket'); setStep(2); }} className="btn btn-secondary" style={{ flex: 1, padding: '1.5rem', fontSize: '1.1rem' }}>
              🏏 Cricket
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Choose Court */}
      {step === 2 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 2: Choose Court</h3>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>
              Change Sport
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {courts.map(c => {
              const isAvail = c.status === 'available';
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCourt(c)}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: isAvail ? 'pointer' : 'not-allowed',
                    background: 'var(--bg-surface)',
                    opacity: isAvail ? 1 : 0.6,
                    transition: 'border-color 0.2s ease'
                  }}
                >
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{c.name}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>${Number(c.hourly_rate).toFixed(2)}/hr</span>
                    <span style={{ fontSize: '0.8rem', color: isAvail ? 'var(--primary)' : '#ef4444', textTransform: 'uppercase', fontWeight: 600 }}>
                      {c.status}
                    </span>
                  </div>
                </div>
              );
            })}
            {courts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No courts available for {sport}.</p>}
          </div>
        </div>
      )}

      {/* Step 3: Choose Date and Time */}
      {step === 3 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Step 3: Choose Date and Time ({selectedCourt?.name})
            </h3>
            <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>
              Change Court
            </button>
          </div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Booking Date:
          </label>
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={date}
            onChange={e => setDate(e.target.value)}
            className="form-input"
            style={{ maxWidth: '300px', marginBottom: '2rem' }}
          />

          <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Available Slots (1 hour duration)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }}>
            {timeSlots.map(t => (
              <button
                key={t}
                onClick={() => handleSelectTime(t)}
                className="btn btn-secondary"
                style={{ padding: '0.75rem', fontWeight: 600 }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Step 4: Review & Confirm Booking
            </h3>
            <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>
              Change Time
            </button>
          </div>

          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem', fontSize: '1.05rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sport</span>
              <strong>{sport}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Court</span>
              <strong>{selectedCourt?.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Date</span>
              <strong>{new Date(date).toLocaleDateString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Time Slot</span>
              <strong>{time} – {calculateEndTime(time)}</strong>
            </div>

            <div style={{ margin: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Base Price</span>
              <strong>${Number(selectedCourt?.hourly_rate || 0).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
              <span>Membership Discount ({priceInfo?.planName || 'Standard'})</span>
              <strong>-{priceInfo?.discountPercent || 0}%</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Final Price</span>
              <strong style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
                ${Number(priceInfo?.finalPrice || 0).toFixed(2)}
              </strong>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 600 }}
          >
            {submitting ? 'Confirming Booking...' : 'Confirm Booking'}
          </button>
        </div>
      )}
    </div>
  );
}
