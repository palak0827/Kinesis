import React from 'react';
import { Award, Shield, Calendar, Sparkles } from 'lucide-react';
import ClubIdBadge from './ClubIdBadge.jsx';

export default function DigitalMembershipCard({
  member,
  pricingCtx,
  onActionClick,
  actionLabel
}) {
  const isWalkIn = pricingCtx?.isWalkIn || (!member?.plan_id && !member?.membership_plans);
  const isExpired = pricingCtx?.isExpired;
  const planName = pricingCtx?.planName || member?.membership_plans?.name || 'Walk-In';
  const expiryDate = member?.expiry_date
    ? new Date(member.expiry_date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  // Tier color scheme: Racing Green with Champagne Gold accents
  const isGold = planName.toLowerCase().includes('gold');
  const isSilver = planName.toLowerCase().includes('silver');

  return (
    <div
      style={{
        background: isWalkIn
          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
          : isExpired
          ? 'linear-gradient(135deg, #451a1a 0%, #1e1111 100%)'
          : isGold
          ? 'linear-gradient(135deg, #0d3b2e 0%, #07251c 60%, #164e3d 100%)'
          : isSilver
          ? 'linear-gradient(135deg, #132f28 0%, #0d221c 100%)'
          : 'linear-gradient(135deg, #0d3b2e 0%, #08261e 100%)',
        color: '#ffffff',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '1.75rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 16px 32px -8px rgba(13, 59, 46, 0.35)',
        border: isGold
          ? '1px solid rgba(197, 168, 105, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.12)'
      }}
    >
      {/* Subtle athletic texture line overlay */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(197, 168, 105, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Top Bar: Club Logo & Tier Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <img
            src="/logo2.png"
            alt="Kinesis Logo"
            style={{ width: '38px', height: '38px', objectFit: 'contain', filter: 'brightness(1.1)' }}
          />
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.08em', color: '#ffffff', lineHeight: 1.1 }}>
              KINESIS
            </div>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: 600 }}>
              SPORTS & ATHLETIC CLUB
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '999px',
            background: isExpired
              ? 'rgba(239, 68, 68, 0.25)'
              : isWalkIn
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(197, 168, 105, 0.25)',
            border: isExpired
              ? '1px solid #ef4444'
              : isWalkIn
              ? '1px solid rgba(255, 255, 255, 0.25)'
              : '1px solid rgba(197, 168, 105, 0.6)',
            color: isExpired ? '#fca5a5' : isWalkIn ? '#e2e8f0' : '#fef08a',
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}
        >
          {isExpired ? (
            'EXPIRED'
          ) : isWalkIn ? (
            'WALK-IN GUEST'
          ) : (
            <>
              <Sparkles size={12} />
              <span>{planName} TIER</span>
            </>
          )}
        </div>
      </div>

      {/* Member Details */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
          Athlete / Member Name
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
          {member?.name || 'Club Member'}
        </div>
      </div>

      {/* Bottom Bar: Club ID & Validity */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          paddingTop: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)', letterSpacing: '0.08em', marginBottom: '0.25rem', fontWeight: 700 }}>
            DIGITAL CLUB ID
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '1.05rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: isGold ? '#fef08a' : '#ffffff'
            }}
          >
            {member?.club_id || '1000000001'}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)', letterSpacing: '0.08em', marginBottom: '0.25rem', fontWeight: 700 }}>
            {isWalkIn ? 'ACCESS TYPE' : 'VALID UNTIL'}
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: isExpired ? '#fca5a5' : '#ffffff' }}>
            {isWalkIn ? 'Pay-as-you-go' : expiryDate || 'Ongoing'}
          </div>
        </div>
      </div>

      {onActionClick && (
        <button
          onClick={onActionClick}
          style={{
            marginTop: '1.25rem',
            width: '100%',
            padding: '0.65rem',
            background: isGold ? '#c5a869' : 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            borderRadius: 'var(--radius-sm, 6px)',
            color: isGold ? '#0f291e' : '#ffffff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          {actionLabel || (isWalkIn ? 'Upgrade to Club Membership' : 'Manage Membership')}
        </button>
      )}
    </div>
  );
}
