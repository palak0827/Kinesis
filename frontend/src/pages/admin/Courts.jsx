import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';

export default function AdminCourts() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourts() {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const { data: courtsData } = await supabase.from('courts').select('*').order('id');
      const { data: bookingsData } = await supabase.from('bookings').select('court_id').eq('booking_date', todayStr).eq('status', 'confirmed');
      
      const counts = {};
      if (bookingsData) {
        bookingsData.forEach(b => {
          counts[b.court_id] = (counts[b.court_id] || 0) + 1;
        });
      }

      if (courtsData) {
        setCourts(courtsData.map(c => ({
          ...c,
          todayBookings: counts[c.id] || 0
        })));
      }
      setLoading(false);
    }
    fetchCourts();
  }, []);

  if (loading) return <div>Loading courts...</div>;

  return (
    <div style={{ maxWidth: '1000px' }}>
      <h1 style={{ marginBottom: '2rem' }}>Courts & Sports</h1>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {courts.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Court Name</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Sport</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Hourly Rate</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Today's Bookings</th>
              </tr>
            </thead>
            <tbody>
              {courts.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < courts.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td style={{ padding: '1.25rem 1rem', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>{c.sport}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>₹{c.hourly_rate}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <span style={{ 
                      fontSize: '0.8rem', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600,
                      background: c.status === 'available' ? 'rgba(16,185,129,0.1)' : c.status === 'maintenance' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                      color: c.status === 'available' ? '#10b981' : c.status === 'maintenance' ? '#f59e0b' : '#ef4444'
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 600 }}>{c.todayBookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No courts found in database.</div>
        )}
      </div>
    </div>
  );
}
