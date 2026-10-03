import React from 'react';

/**
 * Reusable CurrentDate Component
 * Displays Day, Date Month Year (e.g. "Saturday, 3 October 2026")
 * Automatically updates dynamically according to the user's current date.
 */
export default function CurrentDate({ style = {} }) {
  const now = new Date();
  
  // Format: Saturday, 3 October 2026
  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(now);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        background: 'var(--bg-surface)',
        padding: '0.45rem 0.9rem',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        fontWeight: 500,
        letterSpacing: '0.01em',
        ...style
      }}
      title="Current System Date"
    >
      <span style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>📅</span>
      <span>{formattedDate}</span>
    </div>
  );
}
