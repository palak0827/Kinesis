import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { getCourtRevenueStats } from '@backend/services/revenueService.js';
import CurrentDate from '../../components/CurrentDate.jsx';

export default function AdminCourts() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourtRevenue: 0,
    todayCourtRevenue: 0,
    todayBookingsCount: 0
  });

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

      try {
        const revStats = await getCourtRevenueStats();
        setStats(revStats);
      } catch (err) {
        console.error('Error loading court revenue stats:', err);
      }

      setLoading(false);
    }
    fetchCourts();
  }, []);

  if (loading) return <div>Loading courts...</div>;

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.2rem' }}>Court Management</h1>
          <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-muted)' }}>
            Overview of club courts, sport categories, and 30-minute booking rates
          </p>
        </div>
        <CurrentDate />
      </div>

      {/* COURT MANAGEMENT REVENUE SUMMARY BANNER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem', fontWeight: 600 }}>
            Total Court Revenue
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            ₹{stats.totalCourtRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            All-time court bookings
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem', fontWeight: 600 }}>
            Today's Court Revenue
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
            ₹{stats.todayCourtRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Bookings generated today
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem', fontWeight: 600 }}>
            Bookings Today
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {stats.todayBookingsCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Active slots reserved today
          </div>
        </div>
      </div>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {courts.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Court Name</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Sport</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Rate / 30 Min</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Today's Bookings</th>
              </tr>
            </thead>
            <tbody>
              {courts.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < courts.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td style={{ padding: '1.25rem 1rem', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '1.25rem 1rem' }}>{c.sport}</td>
                  <td style={{ padding: '1.25rem 1rem', fontFamily: 'var(--font-mono)' }}>₹{Number(c.hourly_rate).toFixed(0)} / 30 min</td>
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
