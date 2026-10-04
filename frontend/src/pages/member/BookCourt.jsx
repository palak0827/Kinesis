import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { useAuth } from '../../AuthContext.jsx';
import { checkCourtAvailability, createBooking, calculateBookingPrice, checkMemberDailyLimit } from '@backend/services/bookingService.js';
import { recordPayment } from '@backend/services/paymentService.js';
import CourtETicket from '../../components/CourtETicket.jsx';
import PaymentMethodSelector from '../../components/PaymentMethodSelector.jsx';
import { validatePaymentForm, normalizeCardNumber } from '../../utils/paymentValidation.js';
import {
  Calendar, Clock, CheckCircle2, XCircle, AlertTriangle,
  ArrowLeft, ArrowRight, ShieldCheck, ChevronRight, Check
} from 'lucide-react';

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
  const [submitting, setSubmitting] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'CASH', 'CARD', 'UPI'
  const [cardData, setCardData] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [upiId, setUpiId] = useState('');
  const [paymentErrors, setPaymentErrors] = useState({});
  const isSubmittingRef = useRef(false);

  // Generated confirmed ticket modal
  const [completedBooking, setCompletedBooking] = useState(null);

  // Available sports at Kinesis Sports Club (including Table Tennis)
  const SPORTS = [
    { id: 'Tennis', label: 'Tennis', icon: '🎾', desc: 'Championship acrylic & clay courts' },
    { id: 'Badminton', label: 'Badminton', icon: '🏸', desc: 'BWF synthetic tournament courts' },
    { id: 'Table Tennis', label: 'Table Tennis', icon: '🏓', desc: 'ITTF-standard arenas' },
    { id: 'Squash', label: 'Squash', icon: '👟', desc: 'WSF glass-back courts' },
    { id: 'Padel', label: 'Padel', icon: '🎾', desc: 'Super-panoramic glass courts' },
    { id: 'Cricket', label: 'Cricket', icon: '🏏', desc: 'Match pitch & bowling nets' }
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

    // Pre-check daily quota before advancing
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

  const calculatedFinalPrice = Number(
    priceInfo?.finalPrice ??
    priceInfo?.basePrice ??
    (Number(selectedCourt?.hourly_rate || 0) * (duration / 30))
  );

  const calculateEndTime = (startStr, dur = duration) => {
    if (!startStr) return '';
    const [h, m] = startStr.split(':').map(Number);
    const total = h * 60 + m + dur;
    const endH = String(Math.floor(total / 60)).padStart(2, '0');
    const endM = String(total % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  };

  const handleConfirm = async () => {
    if (submitting || isSubmittingRef.current) return;
    setError('');

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

    // Centralized Payment validation
    const validation = validatePaymentForm({
      paymentMethod,
      cardData,
      upiId
    });

    if (!validation.isValid) {
      setPaymentErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      if (firstError) setError(firstError);
      return;
    }
    setPaymentErrors({});

    try {
      isSubmittingRef.current = true;
      setSubmitting(true);
      const end = calculateEndTime(time, duration);

      // Revalidate court availability before processing payment
      const availCheck = await checkCourtAvailability(selectedCourt.id, date, time, end);
      if (!availCheck.available) {
        setError(availCheck.reason || 'This time slot is no longer available. Please choose another slot.');
        setStep(3);
        return;
      }

      const paymentStatus = paymentMethod === 'CASH' ? 'PENDING' : 'PAID';
      const normalizedCardNum = paymentMethod === 'CARD' ? normalizeCardNumber(cardData.number) : '';

      // 1. Create the booking exactly once
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
        amount: calculatedFinalPrice,
        paymentMethod,
        paymentStatus,
        paymentDetails: {
          courtName: selectedCourt.name,
          sport: selectedCourt.sport,
          duration: `${duration} Minutes`,
          date,
          time,
          endTime: end,
          cardLast4: normalizedCardNum ? normalizedCardNum.slice(-4) : undefined,
          upiId: paymentMethod === 'UPI' ? upiId : undefined
        }
      });

      // 3. Clear sensitive temporary fields
      setCardData({ name: '', number: '', expiry: '', cvv: '' });
      setUpiId('');
      setPaymentErrors({});

      // 4. Show Court E-Ticket Modal immediately
      setCompletedBooking({
        ...created,
        courts: selectedCourt,
        members: memberProfile,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        price: calculatedFinalPrice
      });
    } catch (err) {
      console.error('Booking confirmation error:', err);
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('booked') || msg.includes('unavailable') || msg.includes('another customer')) {
        setError("This time slot was just booked by another customer. Please choose another slot.");
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
        setStep(3);
      } else {
        setError(err.message || 'Unable to create booking. Please try again.');
      }
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const bookingSequence = [
    { num: 1, label: 'SPORT', active: step >= 1, done: step > 1 },
    { num: 2, label: 'COURT', active: step >= 2, done: step > 2 },
    { num: 3, label: 'DATE & TIME', active: step >= 3, done: step > 3 },
    { num: 4, label: 'PAYMENT & CONFIRM', active: step >= 4, done: false }
  ];

  return (
    <div className="page-wrapper" style={{ maxWidth: '980px', padding: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button
            onClick={() => navigate('home')}
            className="btn btn-ghost"
            style={{ padding: '0 0.5rem', height: '32px', marginBottom: '0.5rem', gap: '0.35rem' }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <h1 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-main)' }}>
            Court Booking & Scheduling
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Tournament-spec indoor and outdoor sports facilities with real-time reservation.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            borderLeft: '4px solid var(--color-danger)',
            color: '#b91c1c',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.92rem'
          }}
        >
          <AlertTriangle size={20} color="var(--color-danger)" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================
          BOOKING SEQUENCE STEPPER (SECTION 9)
          SPORT -> COURT -> DATE -> TIME -> DURATION -> PRICE -> PAYMENT -> CONFIRM
         ======================================================== */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflowX: 'auto',
          gap: '0.5rem'
        }}
      >
        {bookingSequence.map((s, idx) => (
          <React.Fragment key={s.num}>
            <div
              onClick={() => { if (s.done) setStep(s.num); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: s.done ? 'pointer' : 'default',
                whiteSpace: 'nowrap'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: s.done
                    ? 'var(--color-success)'
                    : s.active
                    ? 'var(--primary)'
                    : 'var(--bg-subtle)',
                  color: s.active || s.done ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 800
                }}
              >
                {s.done ? <Check size={14} strokeWidth={3} /> : s.num}
              </div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: s.active ? 800 : 600,
                  color: s.active ? 'var(--primary)' : 'var(--text-muted)',
                  letterSpacing: '0.04em'
                }}
              >
                {s.label}
              </span>
            </div>
            {idx < bookingSequence.length - 1 && (
              <ChevronRight size={16} color="var(--border-medium)" style={{ flexShrink: 0 }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ========================================================
          STEP 1: SELECT SPORT
         ======================================================== */}
      {step === 1 && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.25rem 0' }}>1. Select Your Sport</h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Choose from our championship facilities at Kinesis Sports Club.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            {SPORTS.map((s) => {
              const isSelected = sport === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSport(s.id)}
                  className="card"
                  style={{
                    padding: '1.75rem 1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--primary-soft)' : 'var(--bg-surface)',
                    boxShadow: isSelected ? '0 4px 14px var(--primary-glow)' : 'var(--shadow-sm)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '2.5rem', marginBottom: '0.75rem', lineHeight: 1 }}>{s.icon}</span>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {s.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 2: SELECT COURT
         ======================================================== */}
      {step === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.25rem 0' }}>
                2. Choose {sport} Facility
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Select a court matching your game standard and lighting preference.
              </p>
            </div>
            <button onClick={() => setStep(1)} className="btn btn-secondary btn-sm">
              &larr; Change Sport
            </button>
          </div>

          {loadingCourts ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading court availability...</p>
          ) : courts.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                No {sport.toLowerCase()} facilities are currently registered.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {courts.map((c) => {
                const isAvail = c.status === 'available';
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCourt(c)}
                    className="card"
                    style={{
                      cursor: isAvail ? 'pointer' : 'not-allowed',
                      border: isAvail ? '1px solid var(--border-subtle)' : '1px dashed var(--color-danger)',
                      opacity: isAvail ? 1 : 0.65,
                      padding: '1.5rem',
                      background: 'var(--bg-surface)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{c.name}</h4>
                      <span
                        className={`badge badge-${isAvail ? 'success' : 'danger'}`}
                        style={{ fontSize: '0.72rem' }}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Sport: {c.sport} • Standard Tournament Surface
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
                          RATE
                        </span>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                          ₹{Number(c.hourly_rate).toFixed(0)}
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}> / 30 min</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!isAvail}
                        className={`btn ${isAvail ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      >
                        {isAvail ? 'Select Court' : 'Under Maintenance'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          STEP 3: DATE, DURATION & TIME SELECTION
         ======================================================== */}
      {step === 3 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.25rem 0' }}>
                3. Select Date, Duration & Time Slot
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                {selectedCourt?.name} • ₹{Number(selectedCourt?.hourly_rate).toFixed(0)} / 30 min
              </p>
            </div>
            <button onClick={() => setStep(2)} className="btn btn-secondary btn-sm">
              &larr; Change Facility
            </button>
          </div>

          {/* Controls: Date & Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                RESERVATION DATE
              </label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                PLAY DURATION
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                {[30, 60, 90, 120].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setDuration(dur)}
                    className="btn"
                    style={{
                      height: '42px',
                      padding: '0 0.25rem',
                      background: duration === dur ? 'var(--primary)' : 'var(--bg-main)',
                      color: duration === dur ? '#ffffff' : 'var(--text-main)',
                      border: duration === dur ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}
                  >
                    {dur}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Slot Legend (Section 9) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'var(--bg-surface)', border: '2px solid var(--color-success)' }} />
              <span style={{ fontWeight: 600 }}>AVAILABLE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'var(--primary)', border: '2px solid var(--accent-gold)' }} />
              <span style={{ fontWeight: 600 }}>SELECTED</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444' }} />
              <span style={{ fontWeight: 600 }}>BOOKED</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'var(--bg-subtle)', border: '1px dashed var(--text-muted)' }} />
              <span style={{ fontWeight: 600 }}>MAINTENANCE</span>
            </div>
          </div>

          {loadingSlots ? (
            <p style={{ color: 'var(--text-muted)' }}>Checking court schedule...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {slots.map((s) => {
                const booked = isSlotBooked(s);
                const isSelected = time === s.start;

                return (
                  <button
                    key={s.start}
                    disabled={booked}
                    onClick={() => handleSelectSlot(s)}
                    className="btn"
                    style={{
                      height: 'auto',
                      padding: '0.85rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected
                        ? 'var(--primary)'
                        : booked
                        ? 'rgba(239, 68, 68, 0.05)'
                        : 'var(--bg-surface)',
                      color: isSelected
                        ? '#ffffff'
                        : booked
                        ? 'var(--text-muted)'
                        : 'var(--text-main)',
                      border: isSelected
                        ? '2px solid var(--accent-gold)'
                        : booked
                        ? '1px solid rgba(239, 68, 68, 0.25)'
                        : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: booked ? 'not-allowed' : 'pointer',
                      boxShadow: isSelected ? '0 4px 12px var(--primary-glow)' : 'var(--shadow-xs)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{s.start}</span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>to {s.end}</span>
                    <div
                      style={{
                        marginTop: '0.35rem',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        color: isSelected
                          ? 'var(--accent-gold)'
                          : booked
                          ? 'var(--color-danger)'
                          : 'var(--color-success)'
                      }}
                    >
                      {isSelected ? (
                        <>
                          <Check size={11} strokeWidth={3} />
                          <span>SELECTED</span>
                        </>
                      ) : booked ? (
                        <>
                          <XCircle size={11} />
                          <span>BOOKED</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={11} />
                          <span>AVAILABLE</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          STEP 4: REVIEW, PRICE & PAYMENT CONFIRMATION
         ======================================================== */}
      {step === 4 && (
        <div className="card-athletic" style={{ padding: '2.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              4. Review Booking & Payment
            </h3>
            <button onClick={() => setStep(3)} className="btn btn-secondary btn-sm">
              &larr; Change Slot
            </button>
          </div>

          {/* Reservation Breakdown Card */}
          <div
            style={{
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.75rem',
              display: 'grid',
              gap: '0.65rem',
              fontSize: '0.92rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sport & Facility:</span>
              <strong>{sport} — {selectedCourt?.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Schedule Timing:</span>
              <strong>{date} • {time} – {calculateEndTime(time, duration)} ({duration}m)</strong>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0.25rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Court Rate ({Math.round(duration / 30)} × 30-min slot{Math.round(duration / 30) === 1 ? '' : 's'}):</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(priceInfo?.basePrice ?? (Number(selectedCourt?.hourly_rate || 0) * (duration / 30))).toFixed(2)}</span>
            </div>

            {priceInfo?.discountAmount > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', fontWeight: 600 }}>
                <span>{priceInfo?.planName} Tier Court Discount ({priceInfo?.discountPercent}%):</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>-₹{Number(priceInfo?.discountAmount).toFixed(2)}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <span>Member Discount:</span>
                <span>₹0.00 (Walk-In / Standard Rate)</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.75rem',
                marginTop: '0.25rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
                  TOTAL TO PAY
                </span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  ₹{calculatedFinalPrice.toFixed(2)}
                </div>
              </div>

              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                PRICE LOCKED
              </span>
            </div>
          </div>

          {/* Centralized Payment Method Selector (Phase 6.2 Compliant) */}
          <PaymentMethodSelector
            paymentMethod={paymentMethod}
            onSelectMethod={(method) => {
              setPaymentMethod(method);
              setPaymentErrors({});
              setError('');
            }}
            cardData={cardData}
            onCardChange={(newCardData) => {
              setCardData(newCardData);
              if (Object.keys(paymentErrors).length > 0) {
                setPaymentErrors({});
              }
            }}
            upiId={upiId}
            onUpiChange={(newUpi) => {
              setUpiId(newUpi);
              if (paymentErrors.upiId) {
                setPaymentErrors(prev => ({ ...prev, upiId: undefined }));
              }
            }}
            errors={paymentErrors}
            finalPrice={calculatedFinalPrice}
          />

          <button
            id="confirm-reserve-court-btn"
            onClick={handleConfirm}
            disabled={submitting}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '1.5rem', fontWeight: 800 }}
          >
            {submitting ? 'Processing...' : `Confirm & Reserve Court (₹${calculatedFinalPrice.toFixed(2)})`}
          </button>
        </div>
      )}

      {/* COURT E-TICKET CONFIRMATION MODAL */}
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
