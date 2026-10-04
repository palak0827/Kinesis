import React, { useState } from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';

export default function ClubIdBadge({ clubId, showLabel = true, size = 'normal', style = {} }) {
  const [copied, setCopied] = useState(false);
  const formattedId = clubId ? String(clubId) : '1000000001';

  const handleCopy = (e) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(formattedId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isSmall = size === 'small';

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: showLabel ? 'column' : 'row',
        alignItems: showLabel ? 'flex-start' : 'center',
        gap: showLabel ? '0.2rem' : '0.5rem',
        ...style
      }}
    >
      {showLabel && (
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)'
          }}
        >
          CLUB ID
        </span>
      )}
      <div
        className="club-id-badge"
        style={{
          background: 'rgba(13, 59, 46, 0.06)',
          border: '1px solid rgba(13, 59, 46, 0.18)',
          borderRadius: 'var(--radius-sm)',
          padding: isSmall ? '0.2rem 0.5rem' : '0.35rem 0.75rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <ShieldCheck size={isSmall ? 13 : 15} color="var(--primary)" />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: isSmall ? '0.82rem' : '0.92rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'var(--primary)'
          }}
        >
          {formattedId}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? 'Copied Club ID!' : 'Copy Club ID'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            color: copied ? 'var(--color-success)' : 'var(--text-muted)',
            transition: 'color 0.15s ease'
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
