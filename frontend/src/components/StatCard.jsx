import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  color = '#10b981',
  trend,
  onClick
}) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        }
      }}
    >
      {/* Subtle background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '90px',
          height: '90px',
          background: color,
          opacity: 0.08,
          filter: 'blur(30px)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: `${color}18`,
              border: `1px solid ${color}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color
            }}
          >
            <Icon size={19} />
          </div>
        )}
      </div>

      <div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.03em',
            lineHeight: 1.15
          }}
        >
          {value}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            fontSize: '12.5px',
            color: 'var(--text-dim)'
          }}
        >
          {trend && (
            <span
              style={{
                color: trend.startsWith('+') ? '#10b981' : '#f43f5e',
                fontWeight: 600
              }}
            >
              {trend}
            </span>
          )}
          {subtext && <span>{subtext}</span>}
        </div>
      </div>
    </div>
  );
}
