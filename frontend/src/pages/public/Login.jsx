import React, { useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { ADMIN_CREDENTIALS } from '../../services/sessionService.js';

export default function Login({ navigate }) {
  const { login } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password, isAdminMode);
      if (res?.type === 'admin') {
        navigate('admin-dashboard');
      } else {
        navigate('home');
      }
    } catch (err) {
      setError(err.message || 'Account not found or credentials are incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setEmail(ADMIN_CREDENTIALS.email);
    setPassword(ADMIN_CREDENTIALS.password);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      
      {/* Top Branding */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', cursor: 'pointer' }} onClick={() => navigate('landing')}>
        <h2 style={{ margin: 0, letterSpacing: '0.08em', color: 'var(--primary)' }}>KINESIS</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Sports Club</span>
      </div>

      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)', borderRadius: 'var(--radius-md)' }}>
        
        {/* Login Type Switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '4px', borderRadius: 'var(--radius-sm)', marginBottom: '2rem' }}>
          <button
            type="button"
            onClick={() => { setIsAdminMode(false); setError(''); }}
            style={{
              flex: 1,
              padding: '0.6rem 0.5rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: !isAdminMode ? 'var(--bg-surface)' : 'transparent',
              color: !isAdminMode ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: !isAdminMode ? 600 : 400,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: !isAdminMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Member Login
          </button>
          <button
            type="button"
            onClick={() => { setIsAdminMode(true); setError(''); }}
            style={{
              flex: 1,
              padding: '0.6rem 0.5rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: isAdminMode ? 'var(--bg-surface)' : 'transparent',
              color: isAdminMode ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: isAdminMode ? 600 : 400,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: isAdminMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Admin Login
          </button>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
            {isAdminMode ? 'Admin Access' : 'Welcome Back'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {isAdminMode ? 'Club management and operations portal' : 'Enter your credentials to access your member dashboard'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {/* Admin Credentials Helper Box */}
        {isAdminMode && (
          <div style={{
            background: 'rgba(6, 78, 59, 0.08)',
            border: '1px solid rgba(6, 78, 59, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--primary)' }}>Demo Admin Account</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>admin@kinesis.club</div>
            </div>
            <button
              type="button"
              onClick={fillAdminCredentials}
              style={{
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Fill Credentials
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
              Email
            </label>
            <input
              type="email"
              placeholder={isAdminMode ? 'admin@kinesis.club' : 'name@example.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: '0.9rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? 'Signing In...' : (isAdminMode ? 'Login as Admin' : 'Login')}
          </button>
        </form>

        {/* Footer Links */}
        {!isAdminMode ? (
          <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
            <button
              type="button"
              onClick={() => navigate('register')}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', fontSize: '0.9rem' }}>
            <button
              type="button"
              onClick={() => setIsAdminMode(false)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 500, cursor: 'pointer', padding: 0 }}
            >
              &larr; Switch to Member Login
            </button>
          </div>
        )}

      </div>

      <button
        type="button"
        onClick={() => navigate('landing')}
        style={{ marginTop: '2rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
      >
        &larr; Back to Kinesis Sports Club
      </button>

    </div>
  );
}
