import React, { useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';

export default function Login({ navigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Let AuthContext handle route change via state in App.jsx
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Login to Kinesis</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
          style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
          style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '0.75rem', background: '#0f172a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Login</button>
      </form>
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => {}} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}>Create Account</button>
        <button onClick={() => {}} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}>Forgot Password</button>
      </div>
      <button onClick={() => navigate('landing')} style={{ marginTop: '2rem', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Back to Home</button>
    </div>
  );
}
