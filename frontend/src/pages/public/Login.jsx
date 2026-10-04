import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import {
  Users, Briefcase, ArrowRight, AlertTriangle, ShieldCheck, Lock, Mail, Info
} from 'lucide-react';
import {
  getRouteFromPath,
  isRouteAuthorized,
  getDefaultRouteForRole,
  isStaffRoute
} from '../../utils/routeSecurity.js';

export default function Login({ navigate }) {
  const { login } = useAuth();

  // Read initial redirect and message from sessionStorage
  const [authNotice, setAuthNotice] = useState(() => {
    try {
      return sessionStorage.getItem('kinesis_auth_message') || '';
    } catch {
      return '';
    }
  });

  // ONLY TWO options as required: 'member' or 'staff'
  const [loginMode, setLoginMode] = useState(() => {
    try {
      const redirect = sessionStorage.getItem('kinesis_redirect_after_login');
      if (redirect) {
        const targetRoute = getRouteFromPath(redirect);
        if (isStaffRoute(targetRoute)) return 'staff';
      }
    } catch {}
    return 'member';
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAccessNotAssigned, setIsAccessNotAssigned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If there was an auth message, keep it visible until user interacts
  }, []);

  const handleTabSwitch = (mode) => {
    setLoginMode(mode);
    setEmail('');
    setPassword('');
    setError('');
    setIsAccessNotAssigned(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsAccessNotAssigned(false);
    setLoading(true);

    try {
      const res = await login(email, password, loginMode);
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
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary)', color: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>K</div>
          <h1 style={{ margin: 0, letterSpacing: '0.08em', color: 'var(--primary)', fontSize: '1.6rem' }}>KINESIS</h1>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
          Sports Club Management Platform
        </div>
      </div>

      <div style={{ maxWidth: '480px', width: '100%' }}>
        
        {/* Strictly TWO Login Options: MEMBER LOGIN & STAFF LOGIN */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          background: 'var(--bg-surface)',
          padding: '0.4rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <button
            type="button"
            id="tab-member-login"
            onClick={() => handleTabSwitch('member')}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: loginMode === 'member' ? 'var(--primary)' : 'transparent',
              color: loginMode === 'member' ? '#ffffff' : 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Users size={18} />
            MEMBER LOGIN
          </button>

          <button
            type="button"
            id="tab-staff-login"
            onClick={() => handleTabSwitch('staff')}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: loginMode === 'staff' ? 'var(--primary)' : 'transparent',
              color: loginMode === 'staff' ? '#ffffff' : 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Briefcase size={18} />
            STAFF LOGIN
          </button>
        </div>

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
              background: loginMode === 'member' ? 'rgba(22, 43, 35, 0.08)' : 'rgba(217, 119, 6, 0.1)',
              color: loginMode === 'member' ? 'var(--primary)' : '#b45309',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem'
            }}>
              {loginMode === 'member' ? 'Registered Member Access' : 'Club Staff & Administration'}
            </div>
            <h2 style={{ fontSize: '1.45rem', margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>
              {loginMode === 'member' ? 'Sign In to Member Portal' : 'Sign In to Staff Portal'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {loginMode === 'member'
                ? 'Access court bookings, club privileges, gear shop, and café orders.'
                : 'All employees, managers, reception, and administrators sign in here. Portal access is determined by your assigned role.'}
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
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  id="login-email-input"
                  placeholder={loginMode === 'member' ? 'member@example.com' : 'employee@kinesis.club'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                {loginMode === 'member' && (
                  <button
                    type="button"
                    onClick={() => navigate('forgot-password')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  id="login-password-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '2.4rem' }}
                />
              </div>
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
              {loading ? 'Authenticating...' : (loginMode === 'member' ? 'Sign In as Member' : 'Sign In to Staff Portal')}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Footer Note */}
          {loginMode === 'member' ? (
            <div style={{ marginTop: '1.75rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Don't have a membership? </span>
              <button
                type="button"
                onClick={() => navigate('register')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Join or Walk-in
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '1.75rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px', color: 'var(--primary)' }} />
              Staff role and departmental assignments are managed centrally by the Administrator.
            </div>
          )}

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
