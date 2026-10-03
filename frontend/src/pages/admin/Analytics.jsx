import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { isCafeProduct } from '@backend/services/cafeService.js';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  TrendingUp, Calendar, BarChart3, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';

export default function AdminAnalytics({ navigate }) {
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState({
    bookings: [],
    sales: [],
    cafeOrders: [],
    payments: []
  });

  // Selected month for breakdown (default to current month 'YYYY-MM')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    async function fetchFinancialRecords() {
      setLoading(true);
      try {
        const [
          { data: bookings },
          { data: sales },
          { data: cafeOrders },
          { data: payments }
        ] = await Promise.all([
          supabase.from('bookings').select('id, booking_date, price, status').neq('status', 'cancelled'),
          supabase.from('sales').select('id, created_at, total, product_id, products(category)'),
          supabase.from('cafe_orders').select('id, created_at, total, status').neq('status', 'CANCELLED'),
          supabase.from('payments').select('id, created_at, amount, reference_type, payment_status')
        ]);

        let localPayments = payments || [];
        if (localPayments.length === 0 && typeof window !== 'undefined') {
          try {
            localPayments = JSON.parse(localStorage.getItem('kinesis_local_payments') || '[]');
          } catch {}
        }

        setAllData({
          bookings: bookings || [],
          sales: sales || [],
          cafeOrders: cafeOrders || [],
          payments: localPayments
        });
      } catch (err) {
        console.error('Failed to load financial records for analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFinancialRecords();
  }, []);

  // UPDATE 18: BUILD LAST 12 MONTHS ROLLING TIMELINE
  const last12Months = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const shortLabel = d.toLocaleDateString('en-IN', { month: 'short' });
      list.push({ key, label, shortLabel, year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return list;
  }, []);

  // UPDATE 13: CANONICAL REVENUE AGGREGATION PER MONTH (ZERO DOUBLE COUNTING)
  const monthlyRevenueMap = useMemo(() => {
    const map = {};

    // Initialize 12 months with 0
    last12Months.forEach(m => {
      map[m.key] = {
        monthKey: m.key,
        name: m.shortLabel,
        fullName: m.label,
        courts: 0,
        gear: 0,
        cafe: 0,
        membership: 0,
        total: 0
      };
    });

    // 1. Court Bookings
    allData.bookings.forEach(b => {
      if (b.booking_date) {
        const mKey = b.booking_date.slice(0, 7);
        if (map[mKey]) {
          map[mKey].courts += Number(b.price || 0);
        }
      }
    });

    // 2. Gear Shop (sales where category is NOT cafe)
    allData.sales.forEach(s => {
      if (!isCafeProduct(s.products?.category) && s.created_at) {
        const mKey = s.created_at.slice(0, 7);
        if (map[mKey]) {
          map[mKey].gear += Number(s.total || 0);
        }
      }
    });

    // 3. Café & Bar
    if (allData.cafeOrders.length > 0) {
      allData.cafeOrders.forEach(o => {
        if (o.created_at) {
          const mKey = o.created_at.slice(0, 7);
          if (map[mKey]) {
            map[mKey].cafe += Number(o.total || 0);
          }
        }
      });
    } else {
      // Fallback: use cafe items in sales
      allData.sales.forEach(s => {
        if (isCafeProduct(s.products?.category) && s.created_at) {
          const mKey = s.created_at.slice(0, 7);
          if (map[mKey]) {
            map[mKey].cafe += Number(s.total || 0);
          }
        }
      });
    }

    // 4. Memberships
    allData.payments.forEach(p => {
      if (p.reference_type === 'MEMBERSHIP' && (p.payment_status === 'PAID' || p.payment_status === 'COMPLETED') && p.created_at) {
        const mKey = p.created_at.slice(0, 7);
        if (map[mKey]) {
          map[mKey].membership += Number(p.amount || 0);
        }
      }
    });

    // Compute totals
    Object.keys(map).forEach(k => {
      map[k].total = Number((map[k].courts + map[k].gear + map[k].cafe + map[k].membership).toFixed(2));
      map[k].courts = Number(map[k].courts.toFixed(2));
      map[k].gear = Number(map[k].gear.toFixed(2));
      map[k].cafe = Number(map[k].cafe.toFixed(2));
      map[k].membership = Number(map[k].membership.toFixed(2));
    });

    return map;
  }, [allData, last12Months]);

  const timelineChartData = useMemo(() => {
    return last12Months.map(m => monthlyRevenueMap[m.key] || {
      name: m.shortLabel,
      fullName: m.label,
      total: 0,
      courts: 0,
      gear: 0,
      cafe: 0,
      membership: 0
    });
  }, [last12Months, monthlyRevenueMap]);

  // UPDATE 14 & 15: MONTH-OVER-MONTH COMPARISON
  const momStats = useMemo(() => {
    const curMonthObj = monthlyRevenueMap[selectedMonth] || { total: 0, courts: 0, gear: 0, cafe: 0, membership: 0 };
    
    // Find previous month key
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthObj = monthlyRevenueMap[prevKey] || { total: 0, courts: 0, gear: 0, cafe: 0, membership: 0 };

    const currentRevenue = curMonthObj.total;
    const previousRevenue = prevMonthObj.total;
    const difference = Number((currentRevenue - previousRevenue).toFixed(2));

    // UPDATE 15: Prevent divide-by-zero
    let percentageChange = null;
    let growthLabel = 'N/A';

    if (previousRevenue > 0) {
      percentageChange = Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2));
      growthLabel = `${percentageChange >= 0 ? '+' : ''}${percentageChange}%`;
    } else if (currentRevenue > 0) {
      growthLabel = 'New Revenue (No prior month base)';
    } else {
      growthLabel = 'No previous-month revenue available';
    }

    return {
      currentRevenue,
      previousRevenue,
      difference,
      percentageChange,
      growthLabel,
      prevKey,
      curBreakdown: curMonthObj
    };
  }, [selectedMonth, monthlyRevenueMap]);

  // Comparison 2-bar chart data
  const comparisonChartData = [
    { name: 'Previous Month', revenue: momStats.previousRevenue, fill: '#94a3b8' },
    { name: 'Selected Month', revenue: momStats.currentRevenue, fill: 'var(--primary)' }
  ];

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading financial analytics...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BarChart3 size={28} color="var(--primary)" />
            Club Financial Analytics
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)' }}>
            Audited monthly revenue trends, canonical category breakdowns, and month-over-month performance
          </p>
        </div>

        {/* Month Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <Calendar size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Focus Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {last12Months.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* UPDATE 14: MONTH-OVER-MONTH KPI TILES */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        
        {/* Selected Month Revenue */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Selected Month Revenue</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--primary)', margin: '0.3rem 0' }}>
            ₹{momStats.currentRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Canonical total of all 4 streams</div>
        </div>

        {/* Previous Month Revenue */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #94a3b8' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Previous Month Revenue</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.3rem 0' }}>
            ₹{momStats.previousRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Comparison baseline</div>
        </div>

        {/* Difference */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: `4px solid ${momStats.difference >= 0 ? '#10b981' : '#ef4444'}` }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Net Difference</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: momStats.difference >= 0 ? '#10b981' : '#ef4444', margin: '0.3rem 0' }}>
            {momStats.difference >= 0 ? '+' : ''}₹{momStats.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Month-over-month delta</div>
        </div>

        {/* Growth Percentage */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>MoM Growth Rate</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.3rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {momStats.percentageChange !== null && (
              momStats.percentageChange >= 0 ? <ArrowUpRight size={22} color="#10b981" /> : <ArrowDownRight size={22} color="#ef4444" />
            )}
            {momStats.growthLabel}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {momStats.previousRevenue === 0 ? 'Zero base prevents divide-by-zero' : 'Performance vs previous month'}
          </div>
        </div>

      </div>

      {/* UPDATE 12 & 18: MONTHLY REVENUE 12-MONTH CHART */}
      <div className="card" style={{ padding: '1.75rem 2rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>12-Month Revenue Trend (Continuous Timeline)</h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Actual persisted database revenue across all 12 rolling months (with ₹0 preserved for inactive periods)
            </p>
          </div>
        </div>

        <div style={{ height: '320px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineChartData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
              <YAxis 
                stroke="var(--text-muted)" 
                fontSize={12} 
                tickFormatter={(val) => `₹${Number(val).toLocaleString()}`} 
              />
              <Tooltip 
                formatter={(val) => [`₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Total Revenue']}
                labelFormatter={(lbl, payload) => payload?.[0]?.payload?.fullName || lbl}
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
              />
              <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                {timelineChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fullName === monthlyRevenueMap[selectedMonth]?.fullName ? 'var(--accent-gold)' : 'var(--primary)'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* UPDATE 16: REVENUE BREAKDOWN & UPDATE 17: CURRENT VS PREVIOUS COMPARISON */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem' }}>
        
        {/* REVENUE BREAKDOWN (UPDATE 16) */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem' }}>
            Revenue Breakdown ({monthlyRevenueMap[selectedMonth]?.fullName})
          </h3>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Categorical revenue sources with zero double-counting guarantee
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Court Bookings */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #3b82f6' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Court Bookings</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hourly bookings & court fees</div>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                ₹{momStats.curBreakdown.courts.toFixed(2)}
              </div>
            </div>

            {/* Gear Shop */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #8b5cf6' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Gear Shop</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Apparel, rackets, equipment</div>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                ₹{momStats.curBreakdown.gear.toFixed(2)}
              </div>
            </div>

            {/* Café & Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #f59e0b' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Café & Bar</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Food, shakes, lounge bar</div>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                ₹{momStats.curBreakdown.cafe.toFixed(2)}
              </div>
            </div>

            {/* Memberships */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent-gold)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Memberships</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gold, Silver, Junior subscriptions</div>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                ₹{momStats.curBreakdown.membership.toFixed(2)}
              </div>
            </div>

            {/* TOTAL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '2px solid var(--border-subtle)', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>TOTAL REVENUE</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                ₹{momStats.curBreakdown.total.toFixed(2)}
              </div>
            </div>

          </div>
        </div>

        {/* UPDATE 17: CURRENT VS PREVIOUS MONTH COMPARISON CHART */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem' }}>
            Current vs Previous Month Performance
          </h3>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Direct visual comparison of monthly aggregate earnings
          </p>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(val) => `₹${val}`} />
                <Tooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {comparisonChartData.map((entry, index) => (
                    <Cell key={`comp-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            marginTop: '1.25rem',
            padding: '1rem',
            background: 'var(--bg-main)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Month-over-Month Delta</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: momStats.difference >= 0 ? '#10b981' : '#ef4444' }}>
                {momStats.difference >= 0 ? '+' : ''}₹{momStats.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{
              padding: '6px 12px',
              borderRadius: '999px',
              background: momStats.difference >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: momStats.difference >= 0 ? '#10b981' : '#ef4444',
              fontWeight: 800,
              fontSize: '0.9rem'
            }}>
              {momStats.growthLabel}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
