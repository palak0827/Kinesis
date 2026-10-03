import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import {
  getRevenueSummary,
  getTodayRevenueBreakdown,
  getMonthlyRevenueBreakdown
} from '@backend/services/revenueService.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import {
  Calendar, TrendingUp, Package, CheckCircle2,
  Users, Award, Shield, Clock, AlertTriangle, UserCheck,
  ShoppingBag, Coffee, Activity, Layers
} from 'lucide-react';
import CurrentDate from '../../components/CurrentDate.jsx';

export default function AdminDashboard({ navigate }) {
  const [loading, setLoading] = useState(true);
  const [revenueFilter, setRevenueFilter] = useState('all'); // 'today', 'week', 'month', 'all'
  const [revenueSummary, setRevenueSummary] = useState({
    totalRevenue: 0,
    courtRevenue: 0,
    gearRevenue: 0,
    cafeRevenue: 0,
    percentages: { court: 0, gear: 0, cafe: 0 },
    counts: { bookings: 0, gearSales: 0, cafeOrders: 0, totalTransactions: 0 }
  });
  const [todayRevenue, setTodayRevenue] = useState({
    totalRevenue: 0,
    courtRevenue: 0,
    gearRevenue: 0,
    cafeRevenue: 0
  });
  const [monthlyRevenueData, setMonthlyRevenueData] = useState([]);
  const [stats, setStats] = useState({
    totalRegisteredUsers: 0,
    totalActiveMembers: 0,
    walkInUsers: 0,
    expiringMembers: 0,
    expiredMembers: 0,
    planDistribution: [],
    bookingsToday: 0,
    utilization: 0,
    revenueToday: 0,
    thisMonthRevenue: 0,
    prevMonthRevenue: 0,
    momChangeDiff: 0,
    momChangePercent: 'N/A',
    lowStock: 0,
    courtUtilizationData: [],
    recentBookings: []
  });

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const threeDaysAhead = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // 1. Fetch all members and plans dynamically
        let allMembers = [];
        try {
          const { data: membersData, error: mErr } = await supabase
            .from('members')
            .select('id, name, email, status, plan_id, expiry_date, user_type, membership_plans (id, name)');
          if (mErr) {
            // Fallback if user_type doesn't exist yet
            const { data: fallbackMembers } = await supabase
              .from('members')
              .select('id, name, email, status, plan_id, expiry_date, membership_plans (id, name)');
            allMembers = fallbackMembers || [];
          } else {
            allMembers = membersData || [];
          }
        } catch {
          allMembers = [];
        }

        const { data: allPlans } = await supabase.from('membership_plans').select('*').order('id');

        let walkInCount = 0;
        let activeMemberCount = 0;
        let expiringCount = 0;
        let expiredCount = 0;

        (allMembers || []).forEach(m => {
          const isWalkIn = m.user_type === 'WALK_IN' || (!m.plan_id && (!m.membership_plans || m.membership_plans.name === 'Walk-In'));
          if (isWalkIn) {
            walkInCount++;
            return;
          }

          const isExpired = m.status === 'expired' || (m.expiry_date && m.expiry_date < todayStr);
          const isExpiringSoon = !isExpired && m.expiry_date && m.expiry_date >= todayStr && m.expiry_date <= threeDaysAhead;

          if (isExpired) {
            expiredCount++;
          } else if (isExpiringSoon) {
            expiringCount++;
            activeMemberCount++;
          } else if (m.status === 'active') {
            activeMemberCount++;
          }
        });
        
        // Dynamically compute breakdown using plan records from database
        const planDistribution = (allPlans || []).map(plan => {
          const count = (allMembers || []).filter(m => {
            const isWalkIn = m.user_type === 'WALK_IN' || (!m.plan_id && (!m.membership_plans || m.membership_plans.name === 'Walk-In'));
            if (isWalkIn) return false;
            const isExpired = m.status === 'expired' || (m.expiry_date && m.expiry_date < todayStr);
            if (isExpired) return false;
            return (m.membership_plans && m.membership_plans.name?.toLowerCase() === plan.name?.toLowerCase()) ||
              m.plan_id === plan.id;
          }).length;
          return {
            id: plan.id,
            name: plan.name,
            count,
            price: plan.monthly_price
          };
        });

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

        // 5. Monthly Revenue & MoM Comparison
        const now = new Date();
        const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

        const [{ data: allBkg }, { data: allSls }, { data: allPmt }] = await Promise.all([
          supabase.from('bookings').select('price, booking_date, status').neq('status', 'cancelled'),
          supabase.from('sales').select('total, created_at'),
          supabase.from('payments').select('amount, created_at, reference_type, payment_status')
        ]);

        let curMonthRev = 0;
        let prevMonthRev = 0;

        (allBkg || []).forEach(b => {
          if (b.booking_date?.startsWith(curMonthKey)) curMonthRev += Number(b.price || 0);
          if (b.booking_date?.startsWith(prevMonthKey)) prevMonthRev += Number(b.price || 0);
        });

        (allSls || []).forEach(s => {
          if (s.created_at?.startsWith(curMonthKey)) curMonthRev += Number(s.total || 0);
          if (s.created_at?.startsWith(prevMonthKey)) prevMonthRev += Number(s.total || 0);
        });

        let paymentsList = allPmt || [];
        if (paymentsList.length === 0 && typeof window !== 'undefined') {
          try {
            paymentsList = JSON.parse(localStorage.getItem('kinesis_local_payments') || '[]');
          } catch {}
        }

        paymentsList.forEach(p => {
          if (p.reference_type === 'MEMBERSHIP' && (p.payment_status === 'PAID' || p.payment_status === 'COMPLETED')) {
            if (p.created_at?.startsWith(curMonthKey)) curMonthRev += Number(p.amount || 0);
            if (p.created_at?.startsWith(prevMonthKey)) prevMonthRev += Number(p.amount || 0);
          }
        });

        const momDiff = Number((curMonthRev - prevMonthRev).toFixed(2));
        let momPercent = 'N/A';
        if (prevMonthRev > 0) {
          const p = (((curMonthRev - prevMonthRev) / prevMonthRev) * 100).toFixed(1);
          momPercent = `${p >= 0 ? '+' : ''}${p}%`;
        } else if (curMonthRev > 0) {
          momPercent = '+100%';
        }

        setStats({
          totalRegisteredUsers: allMembers.length,
          totalActiveMembers: activeMemberCount,
          walkInUsers: walkInCount,
          expiringMembers: expiringCount,
          expiredMembers: expiredCount,
          planDistribution,
          bookingsToday: totalBookings,
          utilization: chartData.length > 0 ? Math.round(chartData.reduce((a, b) => a + b.utilization, 0) / chartData.length) : 0,
          revenueToday: revenue + bookingRevenue,
          thisMonthRevenue: curMonthRev,
          prevMonthRevenue: prevMonthRev,
          momChangeDiff: momDiff,
          momChangePercent: momPercent,
          lowStock: products ? products.length : 0,
          courtUtilizationData: chartData,
          recentBookings: bookings ? bookings.slice(0, 5) : []
        });

        // Fetch categorized revenue data from revenueService
        const [revSum, todRev, mRev] = await Promise.all([
          getRevenueSummary(revenueFilter),
          getTodayRevenueBreakdown(),
          getMonthlyRevenueBreakdown(6)
        ]);
        setRevenueSummary(revSum);
        setTodayRevenue(todRev);
        setMonthlyRevenueData(mRev);

      } catch (err) {
        console.error('Error loading admin dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const handleRevenueFilterChange = async (newFilter) => {
    setRevenueFilter(newFilter);
    try {
      const summary = await getRevenueSummary(newFilter);
      setRevenueSummary(summary);
    } catch (e) {
      console.warn('Error filtering revenue:', e);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading club dashboard...</div>;

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.2rem' }}>Club Operations Overview</h1>
          <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-muted)' }}>Real-time facility utilization and customer lifecycle metrics</p>
        </div>
        <CurrentDate />
      </div>

      {/* CUSTOMER LIFECYCLE SUMMARY BANNER */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1.25rem',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(59,130,246,0.1)', borderRadius: '8px' }}>
            <Users size={20} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Registered</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stats.totalRegisteredUsers}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>
            <UserCheck size={20} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Members</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{stats.totalActiveMembers}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(217,119,6,0.1)', borderRadius: '8px' }}>
            <Shield size={20} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Walk-In Users</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{stats.walkInUsers}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(234,179,8,0.1)', borderRadius: '8px' }}>
            <Clock size={20} color="#eab308" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Expiring Soon</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#eab308' }}>{stats.expiringMembers}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Expired</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{stats.expiredMembers}</div>
          </div>
        </div>
      </div>

      {/* CATEGORIZED REVENUE REPORTING & EXECUTIVE OVERVIEW */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.75rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={22} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Revenue & Departmental Reporting</h2>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Categorized revenue tracking across Courts, Gear Shop, and Café & Bar
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Simple Date Filter */}
            <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-main)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleRevenueFilterChange(tab.id)}
                  className="btn btn-sm"
                  style={{
                    padding: '0.35rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: revenueFilter === tab.id ? 700 : 500,
                    background: revenueFilter === tab.id ? 'var(--primary)' : 'transparent',
                    color: revenueFilter === tab.id ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {navigate && (
              <button
                onClick={() => navigate('admin-analytics')}
                className="btn btn-outline"
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 600 }}
              >
                Full Analytics &rarr;
              </button>
            )}
          </div>
        </div>

        {/* 4 REVENUE CARDS: TOTAL + 3 CATEGORIES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          
          {/* Total Revenue */}
          <div style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08))',
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--primary)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Revenue
                </span>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', color: 'var(--primary)', fontWeight: 700 }}>
                  {revenueFilter === 'today' ? 'Today' : revenueFilter === 'week' ? 'This Week' : revenueFilter === 'month' ? 'This Month' : 'All Time'}
                </span>
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                ₹{revenueSummary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
              Sum of Court, Gear Shop, and Café revenue
            </div>
          </div>

          {/* Court Revenue */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--bg-main)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '4px solid #06b6d4',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Court Revenue
                </span>
                {revenueSummary.totalRevenue > 0 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#06b6d4', background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {revenueSummary.percentages.court}% of total
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#06b6d4', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                ₹{revenueSummary.courtRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {revenueSummary.counts.bookings} valid bookings
            </div>
          </div>

          {/* Gear Shop Revenue */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--bg-main)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '4px solid #10b981',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Gear Shop Revenue
                </span>
                {revenueSummary.totalRevenue > 0 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {revenueSummary.percentages.gear}% of total
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                ₹{revenueSummary.gearRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {revenueSummary.counts.gearSales} retail equipment sales
            </div>
          </div>

          {/* Café & Bar Revenue */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--bg-main)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '4px solid #f59e0b',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Café & Bar Revenue
                </span>
                {revenueSummary.totalRevenue > 0 && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {revenueSummary.percentages.cafe}% of total
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                ₹{revenueSummary.cafeRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {revenueSummary.counts.cafeOrders} kitchen dining & drinks
            </div>
          </div>

        </div>

        {/* TODAY'S PERFORMANCE BANNER */}
        <div style={{
          background: 'var(--bg-main)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Court Revenue (Today)</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#06b6d4', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              ₹{todayRevenue.courtRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Gear Shop Revenue (Today)</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              ₹{todayRevenue.gearRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Café Revenue (Today)</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              ₹{todayRevenue.cafeRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ borderLeft: '2px solid var(--border-subtle)', paddingLeft: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 800 }}>Today's Revenue</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              ₹{todayRevenue.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid var(--primary)' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '50%' }}>
            <Users size={24} color="var(--primary)" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Members</p>
            <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem' }}>{stats.totalActiveMembers} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/ {stats.totalRegisteredUsers} reg.</span></h2>
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
            <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem' }}>₹{stats.revenueToday.toFixed(2)}</h2>
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
          {stats.planDistribution.map((plan, i) => {
            const borderColors = ['var(--accent-gold)', '#94a3b8', '#3b82f6', '#10b981', '#a855f7'];
            const borderColor = borderColors[i % borderColors.length];
            return (
              <div key={plan.id} style={{ padding: '1rem 1.25rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', borderLeft: `4px solid ${borderColor}` }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{plan.name} Tier</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.25rem 0' }}>{plan.count}</div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹{plan.price ? Number(plan.price).toLocaleString() : 'N/A'} / month</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* REVENUE CHARTS: BREAKDOWN & MONTHLY DEPARTMENT TREND */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        
        {/* Department Revenue Breakdown */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Revenue Breakdown by Department</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '4px' }}>
              {revenueFilter === 'today' ? 'Today' : revenueFilter === 'week' ? 'This Week' : revenueFilter === 'month' ? 'This Month' : 'All Time'}
            </span>
          </div>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Courts', revenue: revenueSummary.courtRevenue, fill: '#06b6d4' },
                  { name: 'Gear Shop', revenue: revenueSummary.gearRevenue, fill: '#10b981' },
                  { name: 'Café & Bar', revenue: revenueSummary.cafeRevenue, fill: '#f59e0b' }
                ]}
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  <Cell fill="#06b6d4" />
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
            <span style={{ color: '#06b6d4', fontWeight: 700 }}>Courts: ₹{revenueSummary.courtRevenue.toFixed(0)}</span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>Gear: ₹{revenueSummary.gearRevenue.toFixed(0)}</span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>Café: ₹{revenueSummary.cafeRevenue.toFixed(0)}</span>
          </div>
        </div>

        {/* Monthly Revenue Trend by Department */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Monthly Revenue by Department</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Rolling 6 Months</span>
          </div>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                <Tooltip
                  formatter={(value, name) => [
                    `₹${Number(value).toFixed(2)}`,
                    name === 'court' ? 'Courts' : name === 'gear' ? 'Gear Shop' : name === 'cafe' ? 'Café & Bar' : name
                  ]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                />
                <Legend formatter={(val) => val === 'court' ? 'Courts' : val === 'gear' ? 'Gear Shop' : val === 'cafe' ? 'Café & Bar' : val} />
                <Bar dataKey="court" name="court" stackId="rev" fill="#06b6d4" />
                <Bar dataKey="gear" name="gear" stackId="rev" fill="#10b981" />
                <Bar dataKey="cafe" name="cafe" stackId="rev" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Segmented contribution across sports booking, merchandise, and culinary dining
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
