import React from 'react';
import { CreditCard, QrCode, Banknote, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  formatCardNumber,
  formatCardExpiry,
  formatCardCVV
} from '../utils/paymentValidation.js';

export default function PaymentMethodSelector({
  paymentMethod,
  onSelectMethod,
  cardData = { name: '', number: '', expiry: '', cvv: '' },
  onCardChange,
  upiId = '',
  onUpiChange,
  errors = {},
  finalPrice = 0
}) {
  const methods = [
    { id: 'CASH', label: 'Cash', icon: Banknote, desc: 'Pay at Counter' },
    { id: 'CARD', label: 'Card', icon: CreditCard, desc: 'Debit / Credit' },
    { id: 'UPI', label: 'UPI', icon: QrCode, desc: 'Instant VPA' }
  ];

  const handleCardNumberInput = (e) => {
    const formatted = formatCardNumber(e.target.value);
    onCardChange?.({
      ...cardData,
      number: formatted
    });
  };

  const handleCardNameInput = (e) => {
    // Only allow letters, spaces, and sensible name characters
    const cleanName = e.target.value.replace(/[^a-zA-Z\s.'-]/g, '');
    onCardChange?.({
      ...cardData,
      name: cleanName
    });
  };

  const handleExpiryInput = (e) => {
    const formatted = formatCardExpiry(e.target.value);
    onCardChange?.({
      ...cardData,
      expiry: formatted
    });
  };

  const handleCvvInput = (e) => {
    const formatted = formatCardCVV(e.target.value);
    onCardChange?.({
      ...cardData,
      cvv: formatted
    });
  };

  const handleUpiInput = (e) => {
    // Strip whitespace automatically
    const cleanUpi = e.target.value.replace(/\s+/g, '');
    onUpiChange?.(cleanUpi);
  };

  return (
    <div className="payment-method-selector" style={{ marginBottom: '1.5rem' }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.85rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '0.75rem',
          letterSpacing: '0.05em'
        }}
      >
        Choose Payment Method
      </label>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {methods.map((item) => {
          const Icon = item.icon;
          const isSelected = paymentMethod === item.id;
          return (
            <button
              key={item.id}
              type="button"
              id={`payment-method-tab-${item.id.toLowerCase()}`}
              onClick={() => onSelectMethod?.(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0.9rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
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

      {/* CARD PAYMENT INPUTS */}
      {paymentMethod === 'CARD' && (
        <div
          id="card-payment-form"
          style={{
            background: 'var(--bg-main)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          {/* Cardholder Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
              Cardholder Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="card-holder-name-input"
              autoComplete="cc-name"
              placeholder="e.g. Samir Sharma"
              value={cardData.name}
              onChange={handleCardNameInput}
              className="input-field"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderColor: errors.name ? '#ef4444' : undefined
              }}
            />
            {errors.name && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} />
                <span>{errors.name}</span>
              </div>
            )}
          </div>

          {/* Card Number */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Card Number (Exactly 12 Digits) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {cardData.number.replace(/\s/g, '').length}/12 digits
              </span>
            </div>
            <input
              type="text"
              id="card-number-input"
              inputMode="numeric"
              autoComplete="cc-number"
              maxLength={14} // 12 digits + 2 spaces
              placeholder="1234 5678 9012"
              value={cardData.number}
              onChange={handleCardNumberInput}
              className="input-field"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em',
                borderColor: errors.number ? '#ef4444' : undefined
              }}
            />
            {errors.number && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} />
                <span>{errors.number}</span>
              </div>
            )}
          </div>

          {/* Expiry & CVV */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                Expiry Date (MM/YY) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                id="card-expiry-input"
                inputMode="numeric"
                autoComplete="cc-exp"
                maxLength={5}
                placeholder="MM/YY (e.g. 12/28)"
                value={cardData.expiry}
                onChange={handleExpiryInput}
                className="input-field"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-mono)',
                  borderColor: errors.expiry ? '#ef4444' : undefined
                }}
              />
              {errors.expiry && (
                <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <AlertCircle size={13} />
                  <span>{errors.expiry}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                CVV (3 Digits) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                id="card-cvv-input"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={3}
                placeholder="•••"
                value={cardData.cvv}
                onChange={handleCvvInput}
                className="input-field"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.15em',
                  borderColor: errors.cvv ? '#ef4444' : undefined
                }}
              />
              {errors.cvv && (
                <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <AlertCircle size={13} />
                  <span>{errors.cvv}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
            <ShieldCheck size={14} color="var(--primary)" />
            <span>Card simulation — sensitive data is not permanently stored.</span>
          </div>
        </div>
      )}

      {/* UPI PAYMENT INPUT */}
      {paymentMethod === 'UPI' && (
        <div
          id="upi-payment-form"
          style={{
            background: 'var(--bg-main)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
              UPI ID <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              id="upi-id-input"
              autoComplete="off"
              placeholder="e.g. member@okhdfcbank or 9876543210@paytm"
              value={upiId}
              onChange={handleUpiInput}
              className="input-field"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-mono)',
                borderColor: errors.upiId ? '#ef4444' : undefined
              }}
            />
            {errors.upiId && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={13} />
                <span>{errors.upiId}</span>
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={14} color="var(--primary)" />
            <span>Never share or enter your UPI PIN.</span>
          </div>
        </div>
      )}

      {/* CASH PAYMENT VIEW */}
      {paymentMethod === 'CASH' && (
        <div
          id="cash-payment-form"
          style={{
            background: 'var(--bg-main)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
            <Banknote size={18} color="var(--primary)" />
            <span>Pay at Counter</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Your court reservation will be created with payment status <strong style={{ color: '#d97706' }}>PENDING</strong>.
            Please pay <strong style={{ color: 'var(--primary)' }}>₹{Number(finalPrice || 0).toFixed(2)}</strong> at the reception counter.
          </p>
        </div>
      )}
    </div>
  );
}
