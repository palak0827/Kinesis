import React, { useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import PasswordInput from '../../components/PasswordInput.jsx';
import {
  ArrowRight, AlertTriangle, ShieldCheck, Mail, Info
} from 'lucide-react';
import {
  getRouteFromPath,
  isRouteAuthorized,
  getDefaultRouteForRole
} from '../../utils/routeSecurity.js';

export default function Login({ navigate }) {
  const { login } = useAuth();

  // Read initial redirect and message from sessionStorage
  const [authNotice] = useState(() => {
    try {
      return sessionStorage.getItem('kinesis_auth_message') || '';
    } catch {
      return '';
    }
  });

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAccessNotAssigned, setIsAccessNotAssigned] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsAccessNotAssigned(false);
    setLoading(true);

    try {
      const res = await login(identifier, password);
      const userRole = (res?.role || '').toUpperCase();

      // Check pending redirect from protected route access attempt
      let pendingRedirect = null;
      try {
        pendingRedirect = sessionStorage.getItem('kinesis_redirect_after_login');
        sessionStorage.removeItem('kinesis_redirect_after_login');
        sessionStorage.removeItem('kinesis_auth_message');
      } catch {}

      if (pendingRedirect) {
        const requestedRoute = getRouteFromPath(pendingRedirect);
        // STRICT ROLE CHECK: Only redirect to requested route if CURRENT role is authorized
        if (isRouteAuthorized(userRole, requestedRoute)) {
          navigate(requestedRoute);
          return;
        }
        // If not authorized (e.g. MEMBER -> /admin), DO NOT go to /admin!
        // Fall through to default authorized home for the authenticated role.
      }

      // Default redirect to role's authorized portal
      const targetRoute = getDefaultRouteForRole(userRole);
      navigate(targetRoute);
    } catch (err) {
      const errMsg = err.message || 'Account not found or credentials are incorrect.';
      if (errMsg.includes('Access Not Assigned')) {
        setIsAccessNotAssigned(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', background: 'var(--bg-main)' }}>
      
      {/* Top Branding */}
      <div 
        style={{ textAlign: 'center', marginBottom: '2rem', cursor: 'pointer' }} 
        onClick={() => navigate('landing')}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <img src="/logo2.png" alt="Kinesis" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
          <h1 style={{ margin: 0, letterSpacing: '0.08em', color: 'var(--primary)', fontSize: '1.7rem' }}>KINESIS</h1>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
          Sports Club Management Platform
        </div>
      </div>

      <div style={{ maxWidth: '480px', width: '100%' }}>
        
        {/* Login Form Box */}
        <div className="card" style={{
          width: '100%',
          padding: '2.5rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)'
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              background: 'rgba(22, 43, 35, 0.08)',
              color: 'var(--primary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem'
            }}>
              All Account Types
            </div>
            <h2 style={{ fontSize: '1.45rem', margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>
              Sign In to Kinesis
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Members, walk-ins, staff, and administrators can sign in with their email and password. Your assigned role opens the correct portal.
            </p>
          </div>

          {/* Access Not Assigned Alert (Part 4) */}
          {isAccessNotAssigned && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}>
              <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.92rem', marginBottom: '0.25rem' }}>
                  Access Not Assigned
                </div>
                <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                  Your account has not been assigned an active role yet. Please contact the administrator.
                </div>
              </div>
            </div>
          )}

          {/* Authentication & Security Notice */}
          {authNotice && !error && !isAccessNotAssigned && (
            <div style={{
              background: 'rgba(217, 119, 6, 0.1)',
              color: '#b45309',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              lineHeight: 1.4
            }}>
              <Info size={16} color="#b45309" style={{ flexShrink: 0 }} />
              <span>{authNotice}</span>
            </div>
          )}

          {/* Generic Error Alert */}
          {error && !isAccessNotAssigned && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#dc2626',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  id="login-email-input"
                  placeholder="you@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '2.4rem' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('forgot-password')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
              <PasswordInput
                id="login-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              id="login-submit-button"
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: '0.85rem',
                fontSize: '0.98rem',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Footer Note */}
          <div style={{ marginTop: '1.75rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <div style={{ fontSize: '0.88rem', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Don't have a membership? </span>
              <button
                type="button"
                onClick={() => navigate('register')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Join or Walk-in
              </button>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px', color: 'var(--primary)' }} />
              Staff role and departmental assignments are managed by the Administrator.
            </div>
          </div>

        </div>

      </div>

      <button
        type="button"
        onClick={() => navigate('landing')}
        style={{ marginTop: '2rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
      >
        &larr; Back to Kinesis Sports Club Public Website
      </button>

    </div>
  );
}
