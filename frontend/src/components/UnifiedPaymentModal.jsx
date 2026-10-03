import React, { useState } from 'react';
import { CreditCard, QrCode, Banknote, ShieldCheck, AlertCircle } from 'lucide-react';

export default function UnifiedPaymentModal({
  amount,
  title = 'Checkout Payment',
  subtitle = 'Select your preferred payment method',
  onConfirm,
  onCancel,
  loading = false
}) {
  const [method, setMethod] = useState('CARD'); // 'CASH', 'CARD', 'UPI'

  // Card form state
  const [cardData, setCardData] = useState({
    name: '',
    number: '',
    expiry: '',
    cvv: ''
  });

  // UPI form state
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (method === 'CASH') {
      onConfirm({
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        paymentDetails: { note: 'Pay at counter' }
      });
      return;
    }

    if (method === 'CARD') {
      if (!cardData.name.trim()) {
        setError('Cardholder name is required.');
        return;
      }
      const rawNumber = cardData.number.replace(/\s/g, '');
      if (rawNumber.length < 15) {
        setError('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardData.expiry || cardData.expiry.length < 5) {
        setError('Please enter a valid expiry date (MM/YY).');
        return;
      }
      if (!cardData.cvv || cardData.cvv.length < 3) {
        setError('Please enter a valid CVV.');
        return;
      }

      // Hackathon payment simulation.
      // Production must use a PCI-compliant payment gateway.
      // NEVER store full card number or CVV in database.
      onConfirm({
        paymentMethod: 'CARD',
        paymentStatus: 'PAID',
        paymentDetails: {
          cardholder: cardData.name.trim(),
          last_four: rawNumber.slice(-4)
        }
      });
      return;
    }

    if (method === 'UPI') {
      const upiRegex = /^[\w.-]+@[\w.-]+$/;
      if (!upiId.trim() || !upiRegex.test(upiId.trim())) {
        setError('Please enter a valid UPI ID (e.g. name@upi or member@okhdfcbank).');
        return;
      }

      // Hackathon payment simulation.
      // Production must use a verified UPI intent or dynamic QR gateway.
      // NEVER request or store UPI PIN.
      onConfirm({
        paymentMethod: 'UPI',
        paymentStatus: 'PAID',
        paymentDetails: {
          upi_id: upiId.trim()
        }
      });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-surface)',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>{title}</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>{subtitle}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Payable</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              ₹{Number(amount).toFixed(2)}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Payment Method Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { id: 'CASH', label: 'Cash', icon: Banknote, desc: 'Pay at Counter' },
            { id: 'CARD', label: 'Card', icon: CreditCard, desc: 'Debit / Credit' },
            { id: 'UPI', label: 'UPI', icon: QrCode, desc: 'Instant VPA' }
          ].map((item) => {
            const Icon = item.icon;
            const selected = method === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMethod(item.id);
                  setError('');
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0.9rem 0.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: selected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: selected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={22} color={selected ? 'var(--primary)' : 'var(--text-muted)'} style={{ marginBottom: '0.4rem' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: selected ? 'var(--primary)' : 'var(--text-main)' }}>
                  {item.label}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.desc}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Method: CASH */}
          {method === 'CASH' && (
            <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Banknote size={24} color="#f59e0b" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Cash Payment at Club Counter</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status will be set to PENDING until received</p>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Order will be confirmed immediately. Please pay <strong>₹{Number(amount).toFixed(2)}</strong> at the club reception or dining counter.
              </p>
            </div>
          )}

          {/* Method: CARD */}
          {method === 'CARD' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  CARDHOLDER NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Mercer"
                  value={cardData.name}
                  onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  CARD NUMBER
                </label>
                <input
                  type="text"
                  placeholder="4532 •••• •••• 8901"
                  value={cardData.number}
                  onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                  className="input-field"
                  style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    EXPIRY (MM/YY)
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={cardData.expiry}
                    onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                    className="input-field"
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    CVV
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="•••"
                    value={cardData.cvv}
                    onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                    className="input-field"
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <ShieldCheck size={16} color="var(--primary)" />
                <span>Simulation mode — sensitive card data is never transmitted or stored.</span>
              </div>
            </div>
          )}

          {/* Method: UPI */}
          {method === 'UPI' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  UPI ID (VPA)
                </label>
                <input
                  type="text"
                  placeholder="username@bank or mobile@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Accepts Google Pay, PhonePe, Paytm, and all BHIM UPI handles. Instant approval.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <ShieldCheck size={16} color="var(--primary)" />
                <span>We never request or store your secret UPI PIN.</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem', fontWeight: 700 }}
            >
              {loading ? 'Processing...' : method === 'CASH' ? 'Confirm Order' : `Pay ₹${Number(amount).toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
