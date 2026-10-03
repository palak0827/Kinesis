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
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [time, setTime] = useState('');
  const [dayBookings, setDayBookings] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [priceInfo, setPriceInfo] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Available sports at Kinesis Sports Club
  const SPORTS = [
    { id: 'Tennis', label: 'Tennis', icon: '🎾' },
    { id: 'Cricket', label: 'Cricket', icon: '🏏' },
    { id: 'Badminton', label: 'Badminton', icon: '🏸' },
    { id: 'Squash', label: 'Squash', icon: '👟' },
    { id: 'Padel', label: 'Padel', icon: '🎾' }
  ];

  // Fetch courts dynamically based on selected sport
  useEffect(() => {
    async function loadCourts() {
      try {
        setLoadingCourts(true);
        setError('');
        const { data, error: err } = await supabase
          .from('courts')
          .select('*')
          .ilike('sport', sport)
          .order('id');

        if (err) throw err;
        setCourts(data || []);
      } catch (e) {
        console.error('Error loading courts:', e);
        setError(`Failed to load ${sport.toLowerCase()} courts: ${e.message}`);
      } finally {
        setLoadingCourts(false);
      }
    }
    loadCourts();
  }, [sport]);

  // When court or date changes in Step 3, fetch all existing active bookings to calculate slot availability
  useEffect(() => {
    if (!selectedCourt?.id || !date) return;

    async function loadDayBookings() {
      try {
        setLoadingSlots(true);
        const { data, error: err } = await supabase
          .from('bookings')
          .select('id, start_time, end_time, status')
          .eq('court_id', selectedCourt.id)
          .eq('booking_date', date)
          .neq('status', 'cancelled');

        if (err) throw err;
        setDayBookings(data || []);
      } catch (e) {
        console.error('Error loading court schedule:', e);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadDayBookings();
  }, [selectedCourt, date]);

  // Generate 1-hour booking slots with 30-minute start intervals (08:00 - 21:00)
  const generateSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let min of [0, 30]) {
        if (hour === 20 && min === 30) continue;
        const startH = String(hour).padStart(2, '0');
        const startM = String(min).padStart(2, '0');
        const endH = String(hour + 1).padStart(2, '0');
        const endM = String(min).padStart(2, '0');
        slots.push({
          start: `${startH}:${startM}`,
          end: `${endH}:${endM}`,
          label: `${startH}:${startM} – ${endH}:${endM}`
        });
      }
    }
    return slots;
  };

  const slots = generateSlots();

  // Helper to convert time "HH:mm" or "HH:mm:ss" to minutes from midnight
  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Reusable slot overlap check adhering strictly to club business rules:
  // Two intervals [A, B) and [C, D) overlap if A < D and B > C
  const isSlotBooked = (slot) => {
    const slotStart = toMinutes(slot.start);
    const slotEnd = toMinutes(slot.end);

    return (dayBookings || []).some((b) => {
      if (b.status === 'cancelled') return false;
      const bStart = toMinutes(b.start_time);
      const bEnd = toMinutes(b.end_time);
      return slotStart < bEnd && slotEnd > bStart;
    });
  };

  const handleSelectSport = (sportId) => {
    setSport(sportId);
    setSelectedCourt(null);
    setTime('');
    setStep(2);
  };

  const handleSelectCourt = (c) => {
    if (c.status !== 'available') {
      setError(`Court "${c.name}" is currently under ${c.status}. Please select another facility.`);
      return;
    }
    setError('');
    setSelectedCourt(c);
    setTime('');
    setStep(3);
  };

  const handleSelectSlot = async (slot) => {
    if (isSlotBooked(slot)) {
      setError(`The slot ${slot.label} is already booked. Please select an available slot.`);
      return;
    }

    setError('');
    setTime(slot.start);

    // Calculate member pricing preview for this court
    const price = await calculateBookingPrice(selectedCourt.id, memberProfile?.id);
    setPriceInfo(price);

    // Advance to Step 4: Review and confirmation
    setStep(4);
  };

  const handleConfirm = async () => {
    setError('');
    setSuccessMessage('');

    // Member authentication check
    if (!memberProfile?.id) {
      setError('Unable to identify the current member. Please log in again.');
      return;
    }

    if (!selectedCourt?.id) {
      setError('Please select a valid court.');
      return;
    }

    if (!date || !time) {
      setError('Please select a valid booking date and time slot.');
      return;
    }

    try {
      setSubmitting(true);
      const [h, m] = time.split(':').map(Number);
      const end = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      // Server-side double-validation against race conditions
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
      if (err.message && err.message.toLowerCase().includes('already booked')) {
        setError('This slot became unavailable. Please choose another time.');
      } else {
        setError(err.message || 'Unable to create booking. Please try again.');
      }
      setSubmitting(false);
    }
  };

  const calculateEndTime = (startStr) => {
    if (!startStr) return '';
    const [h, m] = startStr.split(':').map(Number);
    return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '900px' }}>
      <button onClick={() => navigate('home')} className="btn btn-secondary" style={{ marginBottom: '2rem', border: 'none', paddingLeft: 0 }}>
        &larr; Back to Home
      </button>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Book a Court & Pitch</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Reserve tennis courts, cricket nets, squash courts, badminton, and padel facilities.
      </p>

      {/* Global Error Banner */}
      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '2rem' }}>
          ✕ {error}
        </div>
      )}

      {/* Global Success Banner */}
      {successMessage && (
        <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '2rem' }}>
          ✓ {successMessage}
        </div>
      )}

      {/* STEP 1: CHOOSE SPORT */}
      {step === 1 && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Step 1: Choose Sport
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {SPORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSport(s.id)}
                className="btn btn-secondary"
                style={{
                  padding: '1.5rem 1rem',
                  fontSize: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: sport === s.id ? '2px solid var(--primary)' : '1px solid var(--border-subtle)'
                }}
              >
                <span style={{ fontSize: '2rem' }}>{s.icon}</span>
                <span style={{ fontWeight: 600 }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: CHOOSE COURT */}
      {step === 2 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Step 2: Choose {sport} Court / Ground
            </h3>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>
              &larr; Change Sport
            </button>
          </div>

          {loadingCourts ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading {sport.toLowerCase()} facilities...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {courts.map((c) => {
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
                      transition: 'border-color 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 600 }}>
                        {c.sport}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: isAvail ? '#10b981' : '#ef4444',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}
                      >
                        {c.status}
                      </span>
                    </div>

                    <h4 style={{ margin: 0, fontSize: '1.15rem' }}>{c.name}</h4>

                    <div style={{ marginTop: '0.5rem', fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      ${Number(c.hourly_rate).toFixed(2)} / hour
                    </div>
                  </div>
                );
              })}

              {courts.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    No {sport.toLowerCase()} courts are currently available.
                  </p>
                  <p style={{ fontSize: '0.9rem' }}>Please select another sport or check back later.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: CHOOSE DATE & VISUAL SLOT AVAILABILITY */}
      {step === 3 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem 0', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Step 3: Select Date & Available Slot
              </h3>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {selectedCourt?.name} (${Number(selectedCourt?.hourly_rate).toFixed(2)}/hr)
              </div>
            </div>
            <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>
              &larr; Change Facility
            </button>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
              Select Booking Date:
            </label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-input"
              style={{ maxWidth: '280px' }}
            />
          </div>

          {/* Availability Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '3px' }}></span>
              <span><strong>Available</strong> (Selectable)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '3px' }}></span>
              <span><strong>Selected</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '12px', height: '12px', background: '#9ca3af', borderRadius: '3px' }}></span>
              <span><strong>Booked</strong> (Disabled)</span>
            </div>
          </div>

          <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--text-main)' }}>
            Timing Slots (1 Hour Duration • 30-Min Intervals)
          </h4>

          {loadingSlots ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Checking schedule availability for {date}...
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '0.75rem' }}>
              {slots.map((s) => {
                const booked = isSlotBooked(s);
                const isSelected = time === s.start;

                let bg = 'var(--bg-surface)';
                let color = 'var(--text-main)';
                let borderColor = 'var(--border-subtle)';
                let statusLabel = 'Available';
                let statusColor = '#10b981';

                if (booked) {
                  bg = 'rgba(156, 163, 175, 0.12)';
                  color = '#9ca3af';
                  borderColor = '#d1d5db';
                  statusLabel = 'Booked';
                  statusColor = '#ef4444';
                } else if (isSelected) {
                  bg = 'var(--primary)';
                  color = 'white';
                  borderColor = 'var(--primary)';
                  statusLabel = 'Selected ✓';
                  statusColor = 'white';
                }

                return (
                  <button
                    key={s.start}
                    type="button"
                    disabled={booked}
                    onClick={() => handleSelectSlot(s)}
                    style={{
                      background: bg,
                      color: color,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: booked ? 'not-allowed' : 'pointer',
                      opacity: booked ? 0.6 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.start}</span>
                    <span style={{ fontSize: '0.75rem', color: isSelected ? 'white' : 'var(--text-muted)' }}>
                      to {s.end}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: statusColor,
                        textTransform: 'uppercase',
                        marginTop: '0.15rem'
                      }}
                    >
                      {statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 4: REVIEW & CONFIRMATION */}
      {step === 4 && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Step 4: Review & Confirm Booking
            </h3>
            <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>
              &larr; Change Slot
            </button>
          </div>

          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem', fontSize: '1.05rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sport</span>
              <strong>{sport}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Facility / Court</span>
              <strong>{selectedCourt?.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Booking Date</span>
              <strong>{new Date(date).toLocaleDateString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Reserved Timing</span>
              <strong>
                {time} – {calculateEndTime(time)} (1 Hour Session)
              </strong>
            </div>

            <div style={{ margin: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Base Court Fee</span>
              <strong>${Number(selectedCourt?.hourly_rate || 0).toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
              <span>Membership Discount ({priceInfo?.planName || 'Standard Tier'})</span>
              <strong>-{priceInfo?.discountPercent || 0}%</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Total Payable</span>
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
