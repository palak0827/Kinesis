import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeType = 'neutral',
  accentColor = 'var(--primary)',
  style = {}
}) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: `4px solid ${accentColor}`,
        ...style
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)'
          }}
        >
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'var(--primary-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor
            }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ margin: '0.2rem 0' }}>
        <div
          style={{
            fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)',
            fontWeight: 800,
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--text-main)',
            letterSpacing: '-0.03em',
            lineHeight: 1.15
          }}
        >
          {value}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        {subtitle && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {subtitle}
          </span>
        )}
        {badge && (
          <span
            className={`badge badge-${badgeType}`}
            style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
