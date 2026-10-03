import React from 'react';
import { useAuth } from '../../AuthContext.jsx';

export default function Profile() {
  const { user, memberProfile } = useAuth();

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ marginBottom: '2rem' }}>Profile & Settings</h1>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Personal Information</h3>
        
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Full Name</label>
            <div style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              {memberProfile?.name || 'N/A'}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Email Address</label>
            <div style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              {user?.email}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Phone Number</label>
            <div style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              {memberProfile?.phone || 'Not provided'}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Security</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>To change your password, please sign out and use the "Forgot Password" link on the login page.</p>
      </div>
    </div>
  );
}
