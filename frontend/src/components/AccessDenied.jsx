import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { getDefaultRouteForRole, getPortalNameForRoute, getPathFromRoute } from '../utils/routeSecurity.js';

export default function AccessDenied({ user, role, targetRoute, navigate, onLogout }) {
  const portalName = getPortalNameForRoute(targetRoute);
  const targetPath = getPathFromRoute(targetRoute);
  const defaultRoute = getDefaultRouteForRole(role);
  const defaultPath = getPathFromRoute(defaultRoute);

  const getAuthorizedPortalLabel = (r) => {
    const roleUpper = (r || '').toUpperCase();
    if (roleUpper === 'ADMIN') return 'Executive Admin Portal';
    if (roleUpper === 'RESTAURANT_MANAGER') return 'Restaurant Operations';
    if (roleUpper === 'BAR_MANAGER') return 'Bar Operations';
    if (roleUpper === 'SHOP_MANAGER') return 'Gear Shop Portal';
    if (roleUpper === 'COURT_MANAGER') return 'Court Management';
    if (roleUpper === 'STAFF_MANAGER') return 'Staff & HR Portal';
    if (roleUpper === 'RECEPTION') return 'Reception Desk';
    if (roleUpper === 'MEMBER') return 'Member Dashboard';
    return 'Your Authorized Dashboard';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'var(--bg-main)',
      color: 'var(--text-main)'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
        padding: '2.5rem',
        textAlign: 'center'
      }}>
        {/* Shield Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <ShieldAlert size={36} color="#ef4444" />
        </div>

        <div style={{
          display: 'inline-block',
          fontSize: '0.78rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.08)',
          padding: '0.3rem 0.8rem',
          borderRadius: '999px',
          marginBottom: '0.75rem'
        }}>
          HTTP 403 · Access Denied
        </div>

        <h1 style={{
          fontSize: '1.65rem',
          margin: '0 0 0.75rem 0',
          color: 'var(--text-main)',
          fontWeight: 800
        }}>
          Unauthorized Portal Access
        </h1>

        <p style={{
          fontSize: '0.92rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          margin: '0 0 1.5rem 0'
        }}>
          You do not have permission to view <strong style={{ color: 'var(--text-main)' }}>{portalName}</strong> (<code style={{ background: 'var(--bg-main)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>{targetPath}</code>).
        </p>

        {/* User Context Box */}
        <div style={{
          background: 'var(--bg-main)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.75rem',
          textAlign: 'left',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Signed In As:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user?.email || 'Authenticated User'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Your Current Role:</span>
            <span style={{ fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.04em' }}>{role}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Portal Required Role:</span>
            <span style={{ fontWeight: 600, color: '#dc2626' }}>Restricted Department Access</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => navigate(defaultRoute)}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.92rem'
            }}
          >
            <ArrowLeft size={16} />
            Go to {getAuthorizedPortalLabel(role)} ({defaultPath})
          </button>

          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
          >
            <LogOut size={15} />
            Sign Out & Switch Account
          </button>
        </div>
      </div>
    </div>
  );
}
