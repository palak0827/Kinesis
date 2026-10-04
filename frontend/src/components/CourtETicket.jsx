import React from 'react';
import { CheckCircle2, XCircle, Printer, Download, X, Calendar, Clock, MapPin, ShieldCheck, Ticket } from 'lucide-react';
import ClubIdBadge from './ClubIdBadge.jsx';

export default function CourtETicket({ booking, onClose, onNavigateBookings }) {
  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const isCancelled = booking.status === 'cancelled';
    const member = booking.members;
    const planName = member?.membership_plans?.name;
    const customerType = member?.user_type === 'WALK_IN' ? 'Walk-In Guest' : (planName ? `${planName} Member` : 'Club Member');
    const courtName = booking.courts?.name || `Court #${booking.court_id}`;
    const sport = booking.courts?.sport || 'Racquet Sports';
    const startTimeStr = booking.start_time?.slice(0, 5) || '09:00';
    const endTimeStr = booking.end_time?.slice(0, 5) || '10:00';
    const ticketId = booking.ticket_id || `#KSC-BKG-${String(booking.id).padStart(4, '0')}`;
    const checkInStatus = booking.checked_in ? 'CHECKED IN' : 'NOT CHECKED IN';

    const content = `=====================================================
               KINESIS SPORTS CLUB
             OFFICIAL COURT E-TICKET
=====================================================
Booking ID:      #${booking.id}
Ticket Number:   ${ticketId}
Booking Status:  ${isCancelled ? 'CANCELLED' : 'CONFIRMED'}
Check-in Status: ${checkInStatus}
Date of Booking: ${booking.booking_date || 'N/A'}
Schedule Slot:   ${startTimeStr} - ${endTimeStr}

PLAYER INFORMATION:
Player Name:     ${member?.name || 'Club Customer'}
Category:        ${customerType}
Club ID:         ${member?.club_id || 'N/A'}

VENUE INFORMATION:
Facility:        ${courtName}
Sport:           ${sport}

FINANCIAL DETAILS:
Total Charged:   INR ${Number(booking.price || 0).toFixed(2)}
Payment Method:  ${booking.payment_method || 'CARD'}
Payment Status:  ${booking.payment_status || 'PAID'}

INSTRUCTIONS FOR ENTRY:
1. Present this official E-Ticket at reception upon arrival.
2. Mandatory non-marking indoor court shoes required.
3. Cancellation permitted up to 2 hours before scheduled slot.

Thank you for choosing Kinesis Sports Club!
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Kinesis-Ticket-${String(booking.ticket_id || booking.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isCancelled = booking.status === 'cancelled';
  const member = booking.members;
  const isWalkIn = member?.user_type === 'WALK_IN' || (!member?.plan_id && !member?.membership_plans);
  const planName = member?.membership_plans?.name;
  const customerType = isWalkIn ? 'Walk-In Guest' : (planName ? `${planName} Member` : 'Club Member');

  const courtName = booking.courts?.name || `Court #${booking.court_id}`;
  const sport = booking.courts?.sport || 'Racquet Sports';
  const formattedDate = booking.booking_date
    ? new Date(booking.booking_date).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : '';

  const startTimeStr = booking.start_time?.slice(0, 5) || '09:00';
  const endTimeStr = booking.end_time?.slice(0, 5) || '10:00';

  const toMins = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const durationMins = Math.max(30, toMins(endTimeStr) - toMins(startTimeStr));
  const slotsCount = Math.max(1, Math.round(durationMins / 30));

  const ratePer30 = Number(booking.courts?.hourly_rate || (booking.price ? booking.price / slotsCount : 0));
  const totalBasePrice = ratePer30 * slotsCount;
  const finalPrice = Number(booking.price || 0);
  const discountAmount = Math.max(0, totalBasePrice - finalPrice);
  const ticketId = booking.ticket_id || `#KSC-BKG-${String(booking.id).padStart(4, '0')}`;
  const checkInStatus = booking.checked_in ? 'CHECKED IN' : 'PENDING CHECK-IN';

  return (
    <div
      className="print-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 19, 31, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem'
      }}
    >
      <div
        className="card print-area animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-surface)',
          padding: '2.25rem',
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
          border: isCancelled ? '2px solid #ef4444' : '2px solid var(--primary)',
          boxSizing: 'border-box'
        }}
      >
        {/* Close Button (Hidden on Print) */}
        <button
          onClick={onClose}
          className="no-print"
          title="Close Ticket"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%'
          }}
        >
          <X size={20} />
        </button>

        {/* Club Brand Header with Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px dashed var(--border-subtle)',
            paddingBottom: '1.25rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/logo2.png"
              alt="Kinesis Logo"
              style={{ width: '44px', height: '44px', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--primary)', lineHeight: 1.1 }}>
                KINESIS SPORTS CLUB
              </div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                OFFICIAL COURT E-TICKET
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.08em' }}>
              BOOKING ID
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
              #{booking.id}
            </div>
          </div>
        </div>

        {/* Status Indicators: Booking & Check-in & Payment */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: isCancelled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isCancelled ? '#ef4444' : '#10b981',
              border: isCancelled ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            {isCancelled ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
            <span>{isCancelled ? 'BOOKING CANCELLED' : 'BOOKING CONFIRMED'}</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: booking.checked_in ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.1)',
              color: booking.checked_in ? '#10b981' : '#2563eb',
              border: booking.checked_in ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(37, 99, 235, 0.3)'
            }}
          >
            <ShieldCheck size={14} />
            <span>{checkInStatus}</span>
          </div>

          {booking.payment_status === 'PENDING' && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'rgba(217, 119, 6, 0.12)',
                color: '#b45309',
                border: '1px solid rgba(217, 119, 6, 0.3)'
              }}
            >
              <span>Payment Pending — Pay at Reception</span>
            </div>
          )}
        </div>

        {/* Ticket Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem',
            background: 'var(--bg-subtle, #f8f9f5)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md, 10px)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem',
            fontSize: '0.88rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>
              ATHLETE / MEMBER
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)', marginTop: '0.15rem' }}>
              {member?.name || 'Club Guest'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>
              {customerType}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>
              DIGITAL CLUB ID
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.15rem' }}>
              {member?.club_id || 'N/A'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Ticket: {ticketId}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>
              VENUE & SPORT
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)', marginTop: '0.15rem' }}>
              {courtName}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Sport: {sport}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>
              DATE & SCHEDULE
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.15rem' }}>
              {formattedDate}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {startTimeStr} – {endTimeStr} ({durationMins} Min)
            </div>
          </div>
        </div>

        {/* Fare Breakdown */}
        <div
          style={{
            background: 'var(--bg-surface)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md, 10px)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Court Base Rate ({slotsCount} × 30-min slot{slotsCount === 1 ? '' : 's'}):</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>₹{totalBasePrice.toFixed(2)}</span>
          </div>

          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', fontWeight: 600 }}>
              <span>{planName} Member Court Savings:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.6rem',
              marginTop: '0.2rem'
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                ₹{finalPrice.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Method: {booking.payment_method || 'CARD'} ({booking.payment_status || 'PAID'})
              </div>
            </div>

            <span
              className={`badge badge-${booking.payment_status === 'PENDING' ? 'warning' : 'success'}`}
              style={{ fontSize: '0.75rem' }}
            >
              {booking.payment_status === 'PENDING' ? 'PENDING CASH' : 'PAID'}
            </span>
          </div>
        </div>

        {/* Footer Note */}
        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
          Please arrive 10 minutes prior to your reservation time at Kinesis Sports Club reception. Non-marking shoes are strictly mandatory on all indoor courts.
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          {onNavigateBookings && (
            <button
              type="button"
              onClick={onNavigateBookings}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
            >
              View My Bookings
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="btn btn-secondary"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            <Download size={16} />
            <span>Download Ticket</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            <Printer size={16} />
            <span>Print / Save Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
}
