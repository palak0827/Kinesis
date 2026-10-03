import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarDays,
  ShoppingBag,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle,
  PlusCircle
} from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getMembers } from '@backend/services/memberService.js';
import { getBookings, getCourts } from '@backend/services/bookingService.js';
import { getProducts, getSalesHistory } from '@backend/services/inventoryService.js';

export default function Dashboard({ setActiveTab, onQuickAction }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    todayBookings: 0,
    totalSalesRevenue: 0,
    lowStockCount: 0,
    courtUtilization: 0
  });
  const [todayBookingsList, setTodayBookingsList] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [planDistribution, setPlanDistribution] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [members, bookings, courts, products, sales] = await Promise.all([
        getMembers(),
        getBookings(),
        getCourts(),
        getProducts(),
        getSalesHistory(100)
      ]);

      const activeMembers = members.filter((m) => m.status === 'active');
      const todayBookings = bookings.filter(
        (b) => b.booking_date === todayStr && b.status === 'confirmed'
      );
      const totalSalesRevenue = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
      const lowStock = products.filter(
        (p) => Number(p.stock_quantity) <= Number(p.low_stock_threshold)
      );

      // Court utilization: 6 courts * ~14 hours open (08:00 - 22:00 = 14 slots each = 84 max daily slots)
      const maxSlots = Math.max(1, courts.length * 14);
      const courtUtilization = Math.min(100, Math.round((todayBookings.length / maxSlots) * 100));

      // Plan distribution
      const goldCount = members.filter((m) => Number(m.plan_id) === 1).length;
      const silverCount = members.filter((m) => Number(m.plan_id) === 2).length;
      const juniorCount = members.filter((m) => Number(m.plan_id) === 3).length;

      setPlanDistribution([
        { name: 'Gold VIP', value: goldCount, color: '#f59e0b' },
        { name: 'Silver Club', value: silverCount, color: '#94a3b8' },
        { name: 'Junior Youth', value: juniorCount, color: '#06b6d4' }
      ]);

      // Mock 7-day trend combining bookings revenue & shop revenue
      setRevenueTrend([
        { day: 'Mon', bookings: 120, shop: 85 },
        { day: 'Tue', bookings: 160, shop: 110 },
        { day: 'Wed', bookings: 210, shop: 140 },
        { day: 'Thu', bookings: 180, shop: 95 },
        { day: 'Fri', bookings: 290, shop: 220 },
        { day: 'Sat', bookings: 380, shop: 310 },
        { day: 'Sun', bookings: 340, shop: 260 }
      ]);

      setStats({
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        todayBookings: todayBookings.length,
        totalSalesRevenue: Number(totalSalesRevenue.toFixed(2)),
        lowStockCount: lowStock.length,
        courtUtilization
      });

      setTodayBookingsList(todayBookings.slice(0, 5));
      setLowStockItems(lowStock);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Page Header with Quick Actions */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>Club Overview & Analytics</span>
          </h1>
          <p className="page-subtitle">
            Real-time club performance, court utilization, memberships, and pro shop sales.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-primary"
            onClick={() => setActiveTab('bookings')}
          >
            <PlusCircle size={16} />
            <span>Book a Court</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setActiveTab('inventory')}
          >
            <ShoppingBag size={16} />
            <span>New POS Sale</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner if any */}
      {stats.lowStockCount > 0 && (
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 20px',
            borderRadius: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={20} color="#f59e0b" />
            <div>
              <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '13.5px' }}>
                Inventory Notice: {stats.lowStockCount} items at or below reorder threshold
              </span>
              <span style={{ color: '#cbd5e1', fontSize: '13px', marginLeft: '8px' }}>
                ({lowStockItems.map((p) => `${p.name}: ${p.stock_quantity} left`).join(', ')})
              </span>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('inventory')}
            style={{ fontSize: '12px' }}
          >
            <span>Manage Inventory</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '28px'
        }}
      >
        <StatCard
          title="Active Members"
          value={stats.activeMembers}
          subtext={`out of ${stats.totalMembers} total registered`}
          icon={Users}
          color="#10b981"
          trend="+18% MoM"
          onClick={() => setActiveTab('members')}
        />

        <StatCard
          title="Today's Court Bookings"
          value={stats.todayBookings}
          subtext="Active slots scheduled today"
          icon={CalendarDays}
          color="#06b6d4"
          trend="Peak Hours 17:00-21:00"
          onClick={() => setActiveTab('bookings')}
        />

        <StatCard
          title="Court Utilization"
          value={`${stats.courtUtilization}%`}
          subtext="6 Courts (Tennis, Squash, Padel)"
          icon={TrendingUp}
          color="#6366f1"
          trend="Optimal Capacity"
          onClick={() => setActiveTab('bookings')}
        />

        <StatCard
          title="Pro Shop Revenue"
          value={`₹${stats.totalSalesRevenue.toLocaleString()}`}
          subtext="Discounts auto-applied by plan"
          icon={ShoppingBag}
          color="#f59e0b"
          trend="+14% vs Last Week"
          onClick={() => setActiveTab('inventory')}
        />
      </div>

      {/* Charts & Visual Analytics Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
          marginBottom: '28px'
        }}
      >
        {/* Revenue Trends Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Weekly Activity & Revenue Stream</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Comparing court booking revenue vs. pro shop merchandise sales (₹)
              </p>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981' }} />
                <span>Courts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#06b6d4' }} />
                <span>Shop</span>
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="courtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="shopGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#475569" fontSize={12} tickLine={false} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#courtGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="shop"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#shopGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution Doughnut */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Membership Breakdown</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Active members categorized by tier
            </p>
          </div>

          <div style={{ width: '100%', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            {planDistribution.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                  <span style={{ color: 'var(--text-muted)' }}>{item.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: '#fff' }}>{item.value} members</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Today's Court Schedule & Live Feed */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Today's Court Activity Feed</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Live reservations scheduled for {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('bookings')}
          >
            <span>View Full Interactive Court Grid</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {todayBookingsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)', fontSize: '14px' }}>
            No court reservations currently scheduled for today.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Court</th>
                  <th>Sport</th>
                  <th>Time Slot</th>
                  <th>Member</th>
                  <th>Plan Tier</th>
                  <th>Charged Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayBookingsList.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.courts?.name || `Court #${b.court_id}`}</td>
                    <td>
                      <span style={{ color: 'var(--text-muted)' }}>{b.courts?.sport || 'General'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} color="#10b981" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                          {b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.members?.name || `Member #${b.member_id}`}</td>
                    <td>
                      <span className={`badge badge-${b.members?.membership_plans?.name?.toLowerCase() || 'gold'}`}>
                        {b.members?.membership_plans?.name || 'Standard'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#10b981' }}>
                      ₹{Number(b.price).toFixed(2)}
                    </td>
                    <td>
                      <span className="badge badge-active">
                        <CheckCircle size={10} />
                        Confirmed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
