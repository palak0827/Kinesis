import React, { useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';

export default function Register({ navigate }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm) {
      return setError('Passwords do not match');
    }
    
    setLoading(true);
    setError('');
    
    try {
      await register(formData.name, formData.email, formData.phone, formData.password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-wrapper" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>Account Created</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Please check your email to verify your account, or wait to be redirected.</p>
        <button onClick={() => navigate('login')} className="btn btn-primary" style={{ width: '100%' }}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: '400px' }}>
      <button onClick={() => navigate('landing')} className="btn btn-secondary" style={{ marginBottom: '2rem', border: 'none', paddingLeft: 0 }}>&larr; Back</button>
      
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Become a Member</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Join Kinesis Sports Club.</p>
      
      {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '2rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type="text" 
          placeholder="Full Name" 
          className="form-input"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required 
        />
        <input 
          type="email" 
          placeholder="Email Address" 
          className="form-input"
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          required 
        />
        <input 
          type="tel" 
          placeholder="Phone Number (Optional)" 
          className="form-input"
          value={formData.phone}
          onChange={e => setFormData({ ...formData, phone: e.target.value })}
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="form-input"
          value={formData.password}
          onChange={e => setFormData({ ...formData, password: e.target.value })}
          required 
          minLength={6}
        />
        <input 
          type="password" 
          placeholder="Confirm Password" 
          className="form-input"
          value={formData.confirm}
          onChange={e => setFormData({ ...formData, confirm: e.target.value })}
          required 
          minLength={6}
        />
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1rem' }}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
      
      <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)' }}>
        Already have an account? <span onClick={() => navigate('login')} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Login</span>
      </p>
    </div>
  );
}
