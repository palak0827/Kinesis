import React from 'react';
import { Database, RotateCcw, Sparkles, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured, localStore } from '../supabase.js';

export default function Navbar({ onDataReset }) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleResetData = () => {
    if (window.confirm('Reset all club data to the original seed state? This will restore initial members, bookings, and products.')) {
      localStore.resetToDefault();
      if (onDataReset) onDataReset();
    }
  };

  return (
    <header
      style={{
        height: '68px',
        backgroundColor: 'rgba(11, 17, 32, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 36px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      {/* Left: Club Status & Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
          <Clock size={15} color="#94a3b8" />
          <span>{currentDate}</span>
        </div>
        <span style={{ color: 'var(--border-subtle)' }}>•</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={15} color="#10b981" />
          <span style={{ fontSize: '12.5px', color: '#cbd5e1', fontWeight: 600 }}>
            Athletics Complex: Open (07:00 - 23:00)
          </span>
        </div>
      </div>

      {/* Right: Supabase Connection Status & Demo Reset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Backend Status Badge */}
        {isSupabaseConfigured ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '5px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981'
            }}
            title="Connected to your live Supabase database"
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px #10b981'
              }}
            />
            <Database size={13} />
            <span>Supabase Live</span>
          </div>
        ) : (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '5px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: '#06b6d4'
            }}
            title="Running in high-performance local demo mode with automatic persistence. Connect live Supabase in .env anytime."
          >
            <Sparkles size={13} />
            <span>Zero-Config Demo Mode</span>
          </div>
        )}

        {/* Reset Demo Data Button */}
        <button
          onClick={handleResetData}
          className="btn btn-secondary btn-sm"
          title="Reset sample members, bookings, and products to fresh seed state"
          style={{
            fontSize: '12px',
            padding: '5px 11px',
            color: 'var(--text-muted)'
          }}
        >
          <RotateCcw size={13} />
          <span>Reset Demo Data</span>
        </button>
      </div>
    </header>
  );
}
