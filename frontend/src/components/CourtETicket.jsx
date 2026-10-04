import React from 'react';
import { CheckCircle2, XCircle, Printer, Download, X } from 'lucide-react';

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

    const content = `=====================================================
               KINESIS SPORTS CLUB
             COURT BOOKING E-TICKET
=====================================================
Ticket Number:   ${ticketId}
Booking Status:  ${isCancelled ? 'CANCELLED' : 'CONFIRMED'}
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

  return (
    <div
      className="print-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '540px',
          background: 'var(--bg-surface)',
          padding: '2.25rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          border: isCancelled ? '2px solid #ef4444' : '2px solid var(--primary)'
        }}
      >
        {/* Close Button (Hidden on Print) */}
        <button
          onClick={onClose}
          className="no-print"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        {/* Club Brand Header */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase' }}>
            KINESIS SPORTS CLUB
          </div>
          <h2 style={{ margin: '0.25rem 0', fontSize: '1.6rem', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            COURT BOOKING E-TICKET
          </h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Ticket: #KSC-BKG-{String(booking.id).padStart(4, '0')}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 1rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: isCancelled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isCancelled ? '#ef4444' : '#10b981'
            }}
          >
            {isCancelled ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{isCancelled ? 'BOOKING CANCELLED' : 'BOOKING CONFIRMED'}</span>
          </div>
        </div>

        {/* Ticket Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Player / Customer
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {member?.name || 'Club Guest'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
              {customerType}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Facility & Sport
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {courtName}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Sport: {sport}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Date & Schedule
            </div>
            <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>
              {formattedDate}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {startTimeStr} – {endTimeStr} ({durationMins} Min)
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Payment Method
            </div>
            <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>
              {booking.payment_method || 'UPI / Card'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
              {booking.payment_status || 'PAID'}
            </div>
          </div>
        </div>

        {/* Fare Breakdown */}
        <div
          style={{
            background: 'var(--bg-main)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.75rem',
            fontSize: '0.88rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Court Base Rate ({slotsCount} × 30-min {slotsCount === 1 ? 'slot' : 'slots'}):</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>₹{totalBasePrice.toFixed(2)}</span>
          </div>

          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
              <span>{planName} Member Court Discount:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}

          {isWalkIn && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <span>Walk-In Rate (No Discount Applied):</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>₹0.00</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 800,
              fontSize: '1.15rem',
              color: 'var(--text-main)',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.5rem',
              marginTop: '0.35rem'
            }}
          >
            <span>Total Amount:</span>
            <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              ₹{finalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Footer Note */}
        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
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
