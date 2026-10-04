import React from 'react';
import { Printer, X, CheckCircle, Clock, Download } from 'lucide-react';
export default function ReceiptModal({
  receiptType = 'GEAR_SHOP', // 'GEAR_SHOP', 'CAFE_BAR', 'MEMBERSHIP'
  data,
  onClose
}) {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const isCafe = receiptType === 'CAFE_BAR';
  const isMembership = receiptType === 'MEMBERSHIP';
  const isCourt = receiptType === 'COURT_BOOKING';
  const isPos = receiptType === 'POS';

  const title = isCafe
    ? 'CAFÉ & BAR BILL'
    : isMembership
    ? 'MEMBERSHIP SUBSCRIPTION RECEIPT'
    : isCourt
    ? 'COURT RESERVATION RECEIPT'
    : isPos
    ? 'FRONT DESK POS RECEIPT'
    : 'GEAR SHOP RECEIPT';

  const receiptNumber = data.receiptNumber || (data.id ? `#KSC-REC-${String(data.id).padStart(4, '0')}` : '#KSC-REC-0001');
  const customerName = data.customerName || data.members?.name || 'Club Customer';
  const customerType = data.customerType || data.members?.user_type || (data.members?.plan_id ? 'MEMBER' : 'MEMBER');
  const dateStr = data.created_at
    ? new Date(data.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const timeStr = data.created_at
    ? new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const paymentMethod = data.payment_method || data.paymentMethod || 'CARD';
  const paymentStatus = data.payment_status || data.paymentStatus || 'PAID';
  const orderStatus = data.status || 'COMPLETED';
  const clubId = data.club_id || data.clubId || data.members?.club_id || 'N/A';

  const handleDownloadReceipt = () => {
    const rawNumber = data.receiptNumber || (data.id ? `#KSC-REC-${String(data.id).padStart(4, '0')}` : '#KSC-REC-0001');
    const cleanNumber = String(rawNumber).replace(/[^a-zA-Z0-9_-]/g, '_');
    const itemsList = data.items && data.items.length > 0
      ? data.items.map(it => `  - ${it.name || it.products?.name || 'Item'} x${it.quantity} @ ₹${Number(it.unitPrice || it.unit_price || it.price).toFixed(2)} = ₹${Number(it.total || (it.quantity * (it.unitPrice || it.price))).toFixed(2)}`).join('\n')
      : isMembership
      ? `  - ${data.planName || 'Club'} Membership (${data.durationMonths || 12} Mos) = ₹${Number(data.subtotal || data.total).toFixed(2)}`
      : '  - General Club Transaction';

    const content = `========================================
         KINESIS SPORTS CLUB
         OFFICIAL TAX INVOICE & RECEIPT
========================================
Receipt No   : ${rawNumber}
Date & Time  : ${dateStr} at ${timeStr}
Customer     : ${customerName} (${customerType})
Club ID      : ${clubId}
Payment Mode : ${paymentMethod}
Status       : ${paymentStatus === 'PAID' ? 'PAID' : 'PENDING COUNTER CONFIRMATION'}
----------------------------------------
LINE ITEMS:
${itemsList}
----------------------------------------
Subtotal     : ₹${Number(data.subtotal || data.total).toFixed(2)}
Discount     : -₹${Number(data.discount_amount || data.discountAmount || 0).toFixed(2)}
TOTAL PAID   : ₹${Number(data.total).toFixed(2)}
========================================
Thank you for visiting Kinesis Sports Club!
Support: info@kinesissports.com
========================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kinesis_Receipt_${cleanNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
          border: '1px solid var(--border-subtle)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Close Button */}
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

        {/* Brand Header */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
          <img src="/logo2.png" alt="Kinesis Sports Club" style={{ height: '42px', objectFit: 'contain', marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem auto' }} />
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase' }}>
            KINESIS SPORTS CLUB
          </div>
          <h2 style={{ margin: '0.25rem 0', fontSize: '1.5rem', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            {title}
          </h2>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {receiptNumber}
          </div>
        </div>

        {/* Audit Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Customer</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.95rem' }}>{customerName}</strong>
              <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: customerType === 'MEMBER' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: customerType === 'MEMBER' ? '#10b981' : '#3b82f6', fontWeight: 700 }}>
                {customerType}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date & Time</span>
            <span>{dateStr} • {timeStr}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Club ID</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{clubId}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Payment Mode</span>
            <strong style={{ color: 'var(--primary)' }}>{paymentMethod}</strong>
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Payment Status:</span>
            <span style={{ color: paymentStatus === 'PAID' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
              {paymentStatus === 'PAID' ? 'PAID' : 'PENDING (PAY AT COUNTER)'}
            </span>
          </div>
          {isCafe && (
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Kitchen Status:</span>
              <span style={{ fontWeight: 700, color: orderStatus === 'READY' ? '#10b981' : orderStatus === 'PREPARING' ? '#f59e0b' : '#3b82f6' }}>
                {orderStatus}
              </span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '1.25rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 0.75rem' }}>Item</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Unit</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items && data.items.length > 0 ? (
                data.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>
                      {it.name || it.products?.name || `Item #${it.productId || it.product_id}`}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>{it.quantity}</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                      ₹{Number(it.unitPrice || it.unit_price || it.price).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>
                      ₹{Number(it.total || (it.quantity * (it.unitPrice || it.price))).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : isMembership ? (
                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                    {data.planName || 'Club'} Membership ({data.durationMonths || 12} Months)
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>1</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                    ₹{Number(data.subtotal || data.total).toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>
                    ₹{Number(data.subtotal || data.total).toFixed(2)}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Itemized record
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Calculations Breakdown */}
        <div
          style={{
            background: 'var(--bg-main)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            fontSize: '0.88rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Subtotal:</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              ₹{Number(data.subtotal || data.total).toFixed(2)}
            </span>
          </div>

          {Number(data.discount_amount || data.discountAmount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
              <span>Membership Discount:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                -₹{Number(data.discount_amount || data.discountAmount).toFixed(2)}
              </span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 800,
              fontSize: '1.15rem',
              color: 'var(--primary)',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.5rem',
              marginTop: '0.25rem'
            }}
          >
            <span>Total Amount:</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              ₹{Number(data.total).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Official Brand Footer */}
        <div style={{ textAlign: 'center', margin: '1.25rem 0 0.75rem 0', paddingTop: '1rem', borderTop: '1px dashed var(--border-subtle)', color: 'var(--text-muted)' }}>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.04em', fontSize: '0.82rem', textTransform: 'uppercase' }}>
            Thank you for choosing Kinesis Sports Club!
          </p>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Have a healthy, energetic & active day.
          </p>
        </div>

        {/* Actions (Hidden on Print) */}
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem' }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="btn btn-secondary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
          >
            <Download size={16} />
            <span>Download</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            <Printer size={16} />
            <span>Print / Save Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
