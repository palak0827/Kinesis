import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Package, CheckCircle2, Users, Award, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActiveMembers: 0,
    memberDistribution: {},
    bookingsToday: 0,
    utilization: 0,
    revenueToday: 0,
    lowStock: 0,
    courtUtilizationData: [],
    recentBookings: []
  });

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // 1. Fetch active members & membership distribution
        const { data: members } = await supabase
          .from('members')
          .select('id, status, plan_id, membership_plans (id, name)')
          .eq('status', 'active');

        const distribution = { Gold: 0, Silver: 0, Junior: 0 };
        if (members) {
          members.forEach(m => {
            const planName = m.membership_plans?.name || 'Other';
            if (distribution[planName] !== undefined) {
              distribution[planName] += 1;
            } else {
              distribution[planName] = 1;
            }
          });
        }

        // 2. Fetch today's bookings
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*, courts(*)')
          .eq('booking_date', todayStr)
          .neq('status', 'cancelled');

        // 3. Fetch sales today
        const { data: sales } = await supabase
          .from('sales')
          .select('total')
          .gte('created_at', `${todayStr}T00:00:00Z`);

        // 4. Fetch low stock items
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .lt('stock_quantity', 5);

        const revenue = sales ? sales.reduce((acc, curr) => acc + Number(curr.total), 0) : 0;
        const bookingRevenue = bookings ? bookings.reduce((acc, curr) => acc + Number(curr.price || 0), 0) : 0;

        // 5. Calculate court utilization
        const courtCounts = {};
        let totalBookings = 0;
        if (bookings) {
          bookings.forEach(b => {
            const courtName = b.courts?.name || 'Court';
            if (!courtCounts[courtName]) courtCounts[courtName] = 0;
            courtCounts[courtName] += 1;
            totalBookings += 1;
          });
        }

        const chartData = Object.keys(courtCounts).map(name => ({
          name,
          bookings: courtCounts[name],
          utilization: Math.min(100, Math.round((courtCounts[name] / 14) * 100))
        }));

        setStats({
          totalActiveMembers: members ? members.length : 0,
          memberDistribution: distribution,
          bookingsToday: totalBookings,
          utilization: chartData.length > 0 ? Math.round(chartData.reduce((a, b) => a + b.utilization, 0) / chartData.length) : 0,
          revenueToday: revenue + bookingRevenue,
          lowStock: products ? products.length : 0,
          courtUtilizationData: chartData,
          recentBookings: bookings ? bookings.slice(0, 5) : []
        });

      } catch (err) {
        console.error('Error loading admin dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading club dashboard...</div>;

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.2rem' }}>Club Operations Overview</h1>
          <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-muted)' }}>Real-time facility utilization and membership metrics</p>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid var(--primary)' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '50%' }}>
            <Users size={24} color="var(--primary)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Members</p>
            <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem' }}>{stats.totalActiveMembers}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #3b82f6' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '50%' }}>
            <Calendar size={24} color="#3b82f6" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Bookings</p>
            <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem' }}>{stats.bookingsToday}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid var(--accent-gold)' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '50%' }}>
            <TrendingUp size={24} color="var(--accent-gold)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Court Utilization</p>
            <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem' }}>{stats.utilization}%</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #10b981' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '50%' }}>
            <CheckCircle2 size={24} color="#10b981" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Revenue</p>
            <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem' }}>${stats.revenueToday.toFixed(2)}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #ef4444' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '50%' }}>
            <Package size={24} color="#ef4444" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low Stock Items</p>
            <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem' }}>{stats.lowStock}</h2>
          </div>
        </div>

      </div>

      {/* MEMBERSHIP DISTRIBUTION BREAKDOWN */}
      <div className="card" style={{ marginBottom: '2.5rem', padding: '1.75rem 2rem' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} color="var(--primary)" />
          Membership Distribution
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent-gold)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Gold Tier</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.25rem 0' }}>{stats.memberDistribution.Gold || 0}</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Premium Full Access</span>
          </div>

          <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #94a3b8' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Silver Tier</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.25rem 0' }}>{stats.memberDistribution.Silver || 0}</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Standard Club Access</span>
          </div>

          <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #3b82f6' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Junior Tier</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.25rem 0' }}>{stats.memberDistribution.Junior || 0}</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Youth Athletes Under 18</span>
          </div>
        </div>
      </div>

      {/* CHARTS & RECENT BOOKINGS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '2rem' }}>
        
        {/* Court Utilization Chart */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Court Utilization (Today)</h3>
          {stats.courtUtilizationData.length > 0 ? (
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.courtUtilizationData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis dataKey="name" type="category" width={110} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="utilization" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>No court bookings scheduled for today.</p>
          )}
        </div>

        {/* Today's Bookings Table */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Today's Scheduled Sessions</h3>
          {stats.recentBookings.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Court</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Sport</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentBookings.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 500 }}>{b.courts?.name}</td>
                      <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)' }}>{b.courts?.sport}</td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>{b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: b.status === 'confirmed' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: b.status === 'confirmed' ? '#10b981' : '#ef4444',
                          textTransform: 'uppercase',
                          fontWeight: 600
                        }}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>No bookings scheduled for today.</p>
          )}
        </div>

      </div>
    </div>
  );
}
