import React from 'react';

export default function ForgotPassword({ navigate }) {
  return (
    <div className="page-wrapper" style={{ maxWidth: '420px', margin: '4rem auto', textAlign: 'center' }}>
      <button onClick={() => navigate('login')} className="btn btn-secondary" style={{ marginBottom: '2rem' }}>
        &larr; Back to Login
      </button>
      
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Password Assistance</h1>
      <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem' }}>
        External password reset and email authentication are disabled for this hackathon prototype.
        Please contact the club administrator or login using your registered password.
      </p>

      <button onClick={() => navigate('login')} className="btn btn-primary" style={{ width: '100%' }}>
        Return to Login
      </button>
    </div>
  );
}
