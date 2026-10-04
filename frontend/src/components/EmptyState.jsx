import React from 'react';
import { Calendar, ShoppingBag, Coffee, Bell, CheckCircle2 } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no active items to display at this time.',
  icon: Icon = Calendar,
  actionLabel,
  onAction,
  style = {}
}) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        background: 'var(--bg-surface)',
        border: '1px dashed var(--border-medium)',
        borderRadius: 'var(--radius-lg, 16px)',
        ...style
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'var(--primary-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary)',
          marginBottom: '1.25rem'
        }}
      >
        <Icon size={30} strokeWidth={1.8} />
      </div>

      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>
        {title}
      </h3>

      <p style={{ margin: '0 0 1.5rem 0', maxWidth: '420px', fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn btn-primary"
          style={{ padding: '0.65rem 1.5rem', fontWeight: 600 }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
