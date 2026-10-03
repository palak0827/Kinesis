import React from 'react';

export default function Landing({ navigate }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, letterSpacing: '0.05em' }}>KINESIS <span style={{ fontWeight: '400', fontSize: '0.8em', color: 'var(--text-muted)' }}>SPORTS CLUB</span></h2>
        <button onClick={() => navigate('login')} className="btn btn-secondary">Login</button>
      </nav>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '4.5rem', margin: '0 0 1rem 0', color: 'var(--text-main)' }}>Premium Sports.<br/>Better Community.</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '600px' }}>Experience state-of-the-art facilities, expert coaching, and an exclusive community of athletes.</p>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('register')} className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '1.1rem' }}>Become a Member</button>
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', padding: '4rem 2rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div className="card">
            <h3>Courts</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Championship standard Tennis, Padel, and Squash facilities.</p>
          </div>
          <div className="card">
            <h3>Club Shop</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Premium equipment and exclusive Kinesis apparel.</p>
          </div>
          <div className="card">
            <h3>Community</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Join leagues, tournaments, and exclusive member events.</p>
          </div>
        </div>
      </div>
      
      <footer style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)' }}>
        &copy; {new Date().getFullYear()} KINESIS SPORTS CLUB
      </footer>
    </div>
  );
}
