import React from 'react';
import { useAuth } from '../../AuthContext.jsx';

export default function Membership() {
  const { memberProfile } = useAuth();

  if (!memberProfile) return <div>Loading membership details...</div>;

  const plan = memberProfile.membership_plans;

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '2rem' }}>My Membership</h1>
      
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #064e3b 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '12rem', opacity: 0.05, lineHeight: 1 }}>K</div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.8 }}>Kinesis Sports Club</p>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{plan?.name || 'Standard'}</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              background: memberProfile.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
              color: memberProfile.status === 'active' ? '#a7f3d0' : '#fca5a5',
              padding: '4px 12px', 
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              {memberProfile.status}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>MEMBER NAME</p>
            <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>{memberProfile.name}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>VALID UNTIL</p>
            <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>{new Date(memberProfile.expiry_date).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Your Benefits</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{plan?.court_discount || 0}%</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Court Discount</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{plan?.shop_discount || 0}%</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Pro Shop Discount</p>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{plan?.daily_booking_limit || 1}</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Bookings Per Day</p>
        </div>
      </div>
    </div>
  );
}
