import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { useAuth } from '../../AuthContext.jsx';
import { checkCourtAvailability, createBooking, calculateBookingPrice, checkMemberDailyLimit } from '@backend/services/bookingService.js';
import { recordPayment } from '@backend/services/paymentService.js';
import CourtETicket from '../../components/CourtETicket.jsx';
import { CreditCard, QrCode, Banknote, ShieldCheck } from 'lucide-react';

export default function BookCourt({ navigate }) {
  const { memberProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [sport, setSport] = useState('Tennis');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState(30); // 30, 60, 90, 120 minutes
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

  // Payment Selection state for Step 4
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'CASH', 'CARD', 'UPI'
  const [cardData, setCardData] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [upiId, setUpiId] = useState('');

  // Generated confirmed ticket modal
  const [completedBooking, setCompletedBooking] = useState(null);

  // Available sports at Kinesis Sports Club (including Table Tennis)
  const SPORTS = [
    { id: 'Tennis', label: 'Tennis', icon: '🎾' },
    { id: 'Badminton', label: 'Badminton', icon: '🏸' },
    { id: 'Table Tennis', label: 'Table Tennis', icon: '🏓' },
    { id: 'Squash', label: 'Squash', icon: '👟' },
    { id: 'Padel', label: 'Padel', icon: '🎾' },
    { id: 'Cricket', label: 'Cricket', icon: '🏏' }
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

  // Generate booking slots with 30-minute start intervals (08:00 - 21:00) respecting selected duration
  const generateSlots = () => {
    const slots = [];
    const dur = Number(duration) || 30;
    for (let totalMins = 8 * 60; totalMins + dur <= 21 * 60; totalMins += 30) {
      const startH = String(Math.floor(totalMins / 60)).padStart(2, '0');
      const startM = String(totalMins % 60).padStart(2, '0');
      const endTotal = totalMins + dur;
      const endH = String(Math.floor(endTotal / 60)).padStart(2, '0');
      const endM = String(endTotal % 60).padStart(2, '0');
      slots.push({
        start: `${startH}:${startM}`,
        end: `${endH}:${endM}`,
        label: `${startH}:${startM} – ${endH}:${endM}`
      });
    }
    return slots;
  };

  const slots = generateSlots();

  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Checks collision across the ENTIRE [slotStart, slotEnd) interval
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
      setError(`The slot ${slot.label} overlaps with an existing booking. Please select an available slot.`);
      return;
    }

    setError('');

    // Pre-check daily quota before advancing (Phase 23 & 24)
    if (memberProfile?.id) {
      const quotaCheck = await checkMemberDailyLimit(memberProfile.id, date);
      if (!quotaCheck.allowed) {
        setError(quotaCheck.reason);
        return;
      }
    }

    setTime(slot.start);

    // Calculate member or walk-in pricing preview for this court with selected duration
    const price = await calculateBookingPrice(selectedCourt.id, memberProfile?.id, duration);
    setPriceInfo(price);

    // Advance to Step 4: Review, payment method, and confirmation
    setStep(4);
  };

  const handleConfirm = async () => {
    if (submitting) return; // Prevent duplicate rapid clicks
    setError('');
    setSuccessMessage('');

    if (!memberProfile?.id) {
      setError('Unable to identify the active account. Please log in again.');
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

    // Payment validation
    if (paymentMethod === 'CARD') {
      if (!cardData.name.trim() || !cardData.number || !cardData.expiry || !cardData.cvv) {
        setError('Please complete all card payment details.');
        return;
      }
    } else if (paymentMethod === 'UPI') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. member@okhdfcbank).');
        return;
      }
    }

    try {
      setSubmitting(true);
      const end = calculateEndTime(time, duration);

      const paymentStatus = paymentMethod === 'CASH' ? 'PENDING' : 'PAID';

      // 1. Server-side double-validation against race conditions & limits
      const created = await createBooking({
        memberId: memberProfile.id,
        courtId: selectedCourt.id,
        bookingDate: date,
        startTime: time,
        endTime: end,
        durationMinutes: duration,
        paymentMethod,
        paymentStatus
      });

      // 2. Audit record in payments table
      await recordPayment({
        memberId: memberProfile.id,
        referenceType: 'COURT_BOOKING',
        referenceId: created.id,
        amount: priceInfo?.finalPrice ?? priceInfo?.basePrice ?? selectedCourt.hourly_rate,
        paymentMethod,
        paymentStatus,
        paymentDetails: {
          courtName: selectedCourt.name,
          sport: selectedCourt.sport,
          duration: `${duration} Minutes`,
          date,
          time,
          endTime: end
        }
      });

      // 3. Show Court E-Ticket Modal immediately (Phase 10)
      setCompletedBooking({
        ...created,
        courts: selectedCourt,
        members: memberProfile,
        payment_method: paymentMethod,
        payment_status: paymentStatus
      });
    } catch (err) {
      console.error('Booking confirmation error:', err);
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('booked') || msg.includes('unavailable') || msg.includes('another customer')) {
        setError("This time slot was just booked by another customer. Please choose another slot.");
        // Refresh slot availability immediately so user sees the newly booked slot
        if (selectedCourt?.id && date) {
          try {
            const { data: latestBookings } = await supabase
              .from('bookings')
              .select('start_time, end_time, status')
              .eq('court_id', selectedCourt.id)
              .eq('booking_date', date)
              .eq('status', 'confirmed');
            if (latestBookings) setDayBookings(latestBookings);
          } catch (fetchErr) {
            console.error('Error refreshing bookings:', fetchErr);
          }
        }
        setStep(3); // Step back to slot selector so user can pick another slot
      } else {
        setError(err.message || 'Unable to create booking. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const calculateEndTime = (startStr, dur = duration) => {
    if (!startStr) return '';
    const [h, m] = startStr.split(':').map(Number);
    const total = h * 60 + m + dur;
    const endH = String(Math.floor(total / 60)).padStart(2, '0');
    const endM = String(total % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '900px' }}>
      <button onClick={() => navigate('home')} className="btn btn-secondary" style={{ marginBottom: '2rem', border: 'none', paddingLeft: 0 }}>
        &larr; Back to Home
      </button>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Book a Court & Facility</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Select your sport, facility, reservation date, and preferred time slot.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
          ✕ {error}
        </div>
      )}

      {/* STEP INDICATOR */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {['1. Select Sport', '2. Choose Court', '3. Date & Time', '4. Payment & Confirm'].map((label, idx) => (
          <div
            key={idx}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: step === idx + 1 ? 'var(--primary)' : 'var(--bg-surface)',
              color: step === idx + 1 ? 'white' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: '1px solid var(--border-subtle)'
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* STEP 1: SELECT SPORT */}
      {step === 1 && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Choose Sport</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {SPORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSport(s.id)}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '2rem 1rem',
                  border: sport === s.id ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{s.icon}</span>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: SELECT COURT */}
      {step === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Available {sport} Courts</h3>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
              &larr; Change Sport
            </button>
          </div>

          {loadingCourts ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading courts...</p>
          ) : courts.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                No {sport.toLowerCase()} facilities are registered yet.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {courts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCourt(c)}
                  className="card"
                  style={{
                    cursor: c.status === 'available' ? 'pointer' : 'not-allowed',
                    border: '1px solid var(--border-subtle)',
                    opacity: c.status === 'available' ? 1 : 0.6,
                    padding: '1.5rem',
                    background: 'var(--bg-surface)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.15rem' }}>{c.name}</h4>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: c.status === 'available' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: c.status === 'available' ? '#10b981' : '#ef4444'
                      }}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    ₹{Number(c.hourly_rate).toFixed(0)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ 30 min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: DATE & TIME SELECTION */}
      {step === 3 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>Select Date & Time</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                {selectedCourt?.name} • ₹{Number(selectedCourt?.hourly_rate).toFixed(0)} / 30 min
              </p>
            </div>
            <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
              &larr; Change Facility
            </button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              RESERVATION DATE
            </label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="form-input"
              style={{ padding: '0.65rem 1rem', fontSize: '1rem', borderRadius: 'var(--radius-sm)' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              SESSION DURATION
            </label>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {[30, 60, 90, 120].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setDuration(dur)}
                  className="btn"
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: duration === dur ? 'var(--primary)' : 'var(--bg-surface)',
                    color: duration === dur ? 'white' : 'var(--text-main)',
                    border: duration === dur ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  {dur} Minutes ({dur / 30} {dur === 30 ? 'slot' : 'slots'})
                </button>
              ))}
            </div>
          </div>

          <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Available Time Slots ({duration} Minutes)</h4>

          {loadingSlots ? (
            <p style={{ color: 'var(--text-muted)' }}>Checking court schedule...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
              {slots.map((s) => {
                const booked = isSlotBooked(s);
                return (
                  <button
                    key={s.start}
                    disabled={booked}
                    onClick={() => handleSelectSlot(s)}
                    className="btn"
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: booked ? 'var(--bg-main)' : 'var(--bg-surface)',
                      color: booked ? 'var(--text-muted)' : 'var(--text-main)',
                      border: booked ? '1px solid var(--border-subtle)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: booked ? 'not-allowed' : 'pointer',
                      opacity: booked ? 0.5 : 1
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{s.start}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>to {s.end}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: booked ? '#ef4444' : '#10b981', marginTop: '0.2rem' }}>
                      {booked ? 'BOOKED' : 'AVAILABLE'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 4: REVIEW, PAYMENT & CONFIRMATION */}
      {step === 4 && (
        <div className="card" style={{ borderLeft: '4px solid var(--primary)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Step 4: Review & Confirm Booking
            </h3>
            <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>
              &larr; Change Slot
            </button>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sport:</span>
              <strong>{sport}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Court / Facility:</span>
              <strong>{selectedCourt?.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
              <strong>{duration} Minutes</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Reserved Timing:</span>
              <strong>{time} – {calculateEndTime(time, duration)}</strong>
            </div>

            <div style={{ margin: '0.5rem 0', borderTop: '1px solid var(--border-subtle)' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Rate:</span>
              <span>₹{Number(selectedCourt?.hourly_rate || 0).toFixed(0)} / 30 min</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>{Math.round(duration / 30)} × 30-minute {Math.round(duration / 30) === 1 ? 'slot' : 'slots'}:</span>
              <span>₹{Number(priceInfo?.basePrice ?? (Number(selectedCourt?.hourly_rate || 0) * (duration / 30))).toFixed(2)}</span>
            </div>

            {priceInfo?.discountAmount > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                <span>{priceInfo?.planName} Member Discount ({priceInfo?.discountPercent}%):</span>
                <span>-₹{Number(priceInfo?.discountAmount).toFixed(2)}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>Member Discount:</span>
                <span>₹0.00 (Walk-In / Standard Rate)</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.25rem', fontWeight: 800, fontSize: '1.3rem' }}>
              <span>Final Price:</span>
              <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                ₹{Number(priceInfo?.finalPrice ?? priceInfo?.basePrice ?? 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Choose Payment Method
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote, desc: 'Pay at Counter' },
                { id: 'CARD', label: 'Card', icon: CreditCard, desc: 'Debit / Credit' },
                { id: 'UPI', label: 'UPI', icon: QrCode, desc: 'Instant VPA' }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = paymentMethod === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPaymentMethod(item.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '0.9rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                      cursor: 'pointer'
                    }}
                  >
                    <Icon size={20} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} style={{ marginBottom: '0.25rem' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Card Simulation Inputs */}
            {paymentMethod === 'CARD' && (
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Cardholder Name"
                  value={cardData.name}
                  onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
                <input
                  type="text"
                  placeholder="Card Number (e.g. 4532 •••• •••• 8901)"
                  value={cardData.number}
                  onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={cardData.expiry}
                    onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="CVV"
                    value={cardData.cvv}
                    onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={14} color="var(--primary)" />
                  <span>Card simulation — sensitive data is not permanently stored.</span>
                </div>
              </div>
            )}

            {/* UPI Simulation Input */}
            {paymentMethod === 'UPI' && (
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <input
                  type="text"
                  placeholder="Enter UPI ID (e.g. user@okhdfcbank)"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                  <ShieldCheck size={14} color="var(--primary)" />
                  <span>Never share or enter your UPI PIN.</span>
                </div>
              </div>
            )}

            {/* Cash Simulation Note */}
            {paymentMethod === 'CASH' && (
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Your court reservation will be confirmed with payment status <strong>PENDING</strong>. Please pay ₹{Number(priceInfo?.finalPrice ?? priceInfo?.basePrice ?? selectedCourt?.hourly_rate).toFixed(2)} at the reception desk upon arrival.
              </div>
            )}
          </div>

          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 700 }}
          >
            {submitting ? 'Confirming Reservation...' : `Confirm & Reserve Court (₹${Number(priceInfo?.finalPrice ?? priceInfo?.basePrice ?? selectedCourt?.hourly_rate).toFixed(2)})`}
          </button>
        </div>
      )}

      {/* COURT E-TICKET CONFIRMATION MODAL (Phase 10) */}
      {completedBooking && (
        <CourtETicket
          booking={completedBooking}
          onClose={() => {
            setCompletedBooking(null);
            navigate('bookings');
          }}
          onNavigateBookings={() => {
            setCompletedBooking(null);
            navigate('bookings');
          }}
        />
      )}
    </div>
  );
}
