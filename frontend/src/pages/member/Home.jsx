import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { getBookings } from '@backend/services/bookingService.js';
import { supabase } from '@backend/services/supabaseClient.js';
import CurrentDate from '../../components/CurrentDate.jsx';
import ClubIdBadge from '../../components/ClubIdBadge.jsx';
import DigitalMembershipCard from '../../components/DigitalMembershipCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { getUserPricingContext } from '../../utils/pricingEngine.js';
import {
  AlertCircle, Award, Sparkles, ArrowRight, Clock, Calendar,
  ShoppingBag, Coffee, ChevronRight, Bell, Trophy, CheckCircle2
} from 'lucide-react';

export default function MemberHome({ navigate }) {
  const { memberProfile } = useAuth();
  const [upcomingBooking, setUpcomingBooking] = useState(null);
  const [todayUsageCount, setTodayUsageCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Promotional messages for Walk-In / Membership
  const PROMO_MESSAGES = [
    {
      title: 'Play more. Pay less.',
      desc: 'Members receive up to 50% preferred court pricing and higher booking quotas.',
      tag: 'Member Perks'
    },
    {
      title: 'Enjoy more of Kinesis.',
      desc: 'Unlock Gear Shop discounts (up to 20%) and handcrafted Café & Bar member savings.',
      tag: 'Club Dining'
    },
    {
      title: 'Make Kinesis your club.',
      desc: 'Explore Gold, Silver and Junior memberships tailored to your playing routine.',
      tag: 'Flexible Plans'
    }
  ];

  const [promoIndex, setPromoIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % PROMO_MESSAGES.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (memberProfile?.id) {
      // 1. Load bookings
      getBookings({ member_id: memberProfile.id }).then((bookings) => {
        const todayStr = new Date().toISOString().split('T')[0];

        // Count confirmed bookings for today
        const todaysBookings = (bookings || []).filter(
          (b) => b.booking_date === todayStr && b.status === 'confirmed'
        );
        setTodayUsageCount(todaysBookings.length);

        // Find next confirmed upcoming booking
        const upcoming = (bookings || [])
          .filter(
            (b) =>
              b.status === 'confirmed' &&
              new Date(`${b.booking_date}T${b.start_time}`) > new Date()
          )
          .sort(
            (a, b) =>
              new Date(`${a.booking_date}T${a.start_time}`) -
              new Date(`${b.booking_date}T${b.start_time}`)
          );

        if (upcoming.length > 0) setUpcomingBooking(upcoming[0]);
      }).catch(err => console.warn('Bookings load:', err));

      // 2. Load recent orders
      if (supabase) {
        supabase
          .from('cafe_orders')
          .select('*')
          .eq('member_id', memberProfile.id)
          .order('id', { ascending: false })
          .limit(3)
          .then(({ data }) => {
            if (data) setRecentOrders(data);
          })
          .catch(err => console.warn('Cafe orders load:', err));

        // 3. Load notifications
        supabase
          .from('notifications')
          .select('*')
          .or(`recipient_type.eq.ALL,member_id.eq.${memberProfile.id}`)
          .order('id', { ascending: false })
          .limit(3)
          .then(({ data }) => {
            if (data) setNotifications(data);
          })
          .catch(err => console.warn('Notifications load:', err));
      }
    }
  }, [memberProfile]);

  const pricingCtx = getUserPricingContext(memberProfile);
  const { isWalkIn, isExpired, isExpiringSoon, daysRemaining, planName, dailyBookingLimit } = pricingCtx;
  const currentPromo = PROMO_MESSAGES[promoIndex];

  const clubEvents = [
    { title: 'Kinesis Open Tennis Doubles Championship', date: 'Oct 24, 2026', tag: 'Tournament', time: '09:00 AM' },
    { title: 'Master Badminton Footwork Clinic with Coach Rohan', date: 'Oct 28, 2026', tag: 'Masterclass', time: '06:30 PM' },
    { title: 'Artisan Coffee Tasting & Club Social Evening', date: 'Nov 02, 2026', tag: 'Social', time: '07:00 PM' }
  ];

  return (
    <div className="page-wrapper" style={{ maxWidth: '1180px', padding: 0 }}>

      {/* ========================================================
          1. TOP IDENTITY & GREETING BAR (SECTION 6 & 7)
          Greeting | Member Name | Club ID | Membership | Expiry | Date
         ======================================================== */}
      <div
        className="card-athletic"
        style={{
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          background: 'var(--bg-surface)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(13, 59, 46, 0.25)',
              flexShrink: 0
            }}
          >
            {(memberProfile?.name || 'A')[0].toUpperCase()}
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Welcome to Kinesis Sports Club,
            </div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 1.9rem)', margin: '0.1rem 0 0.4rem 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {memberProfile?.name || 'Club Athlete'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <StatusBadge
                status={isExpired ? 'EXPIRED' : isWalkIn ? 'WALK_IN' : 'ACTIVE'}
                label={isWalkIn ? 'Walk-In Guest' : isExpired ? 'Expired Membership' : `${planName} Member`}
              />
              {memberProfile?.expiry_date && !isWalkIn && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Valid until {new Date(memberProfile.expiry_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <ClubIdBadge clubId={memberProfile?.club_id} />
          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem' }}>
            <CurrentDate />
          </div>
        </div>
      </div>

      {/* ========================================================
          EXPIRY / WARNING ALERTS
         ======================================================== */}
      {isExpired && (
        <div
          className="card"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            borderLeft: '4px solid var(--color-danger)',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={22} color="var(--color-danger)" />
            <div>
              <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.95rem' }}>
                Your {memberProfile?.membership_plans?.name || 'Club'} Membership has expired.
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Renew now to restore 50% court discounts, higher booking quotas, and gear savings.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('membership')}
            className="btn btn-danger"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
          >
            Renew Membership
          </button>
        </div>
      )}

      {isExpiringSoon && (
        <div
          className="card"
          style={{
            background: 'rgba(217, 119, 6, 0.08)',
            borderLeft: '4px solid var(--color-warning)',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={22} color="var(--color-warning)" />
            <div>
              <div style={{ fontWeight: 700, color: '#b45309', fontSize: '0.95rem' }}>
                Your {planName} Membership expires in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}.
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Renew early to keep your daily court booking limit and discount privileges uninterrupted.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('membership')}
            className="btn"
            style={{ background: 'var(--color-warning)', color: '#ffffff', padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
          >
            Renew Membership
          </button>
        </div>
      )}

      {isWalkIn && (
        <div
          className="card animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, rgba(13, 59, 46, 0.07) 0%, rgba(197, 168, 105, 0.12) 100%)',
            borderLeft: '4px solid var(--primary)',
            padding: '1.5rem 1.75rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Sparkles size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: 'var(--primary)' }}>
                {currentPromo.tag}
              </span>
            </div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', color: 'var(--text-main)' }}>
              {currentPromo.title}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {currentPromo.desc}
            </p>
          </div>

          <button
            onClick={() => navigate('membership')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>Explore Memberships</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ========================================================
          2. PROMINENT QUICK ACTIONS BAR (SECTION 6)
          Book Court | My Bookings | Gear Shop | Café & Bar
         ======================================================== */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 800, marginBottom: '0.85rem' }}>
          CLUB QUICK ACTIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div
            onClick={() => navigate('book')}
            className="card"
            style={{
              padding: '1.25rem 1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              borderLeft: '4px solid var(--primary)',
              background: 'var(--bg-surface)'
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
              <Calendar size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.02rem', color: 'var(--text-main)' }}>Book Court</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tennis, Padel, Squash</div>
            </div>
          </div>

          <div
            onClick={() => navigate('bookings')}
            className="card"
            style={{
              padding: '1.25rem 1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              borderLeft: '4px solid var(--accent-gold)',
              background: 'var(--bg-surface)'
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', background: 'rgba(197, 168, 105, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309', flexShrink: 0 }}>
              <Award size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.02rem', color: 'var(--text-main)' }}>My Bookings</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>E-Tickets & Schedules</div>
            </div>
          </div>

          <div
            onClick={() => navigate('shop')}
            className="card"
            style={{
              padding: '1.25rem 1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              borderLeft: '4px solid #10b981',
              background: 'var(--bg-surface)'
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
              <ShoppingBag size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.02rem', color: 'var(--text-main)' }}>Gear Shop</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pro Rackets & Apparel</div>
            </div>
          </div>

          <div
            onClick={() => navigate('cafe-orders')}
            className="card"
            style={{
              padding: '1.25rem 1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              borderLeft: '4px solid #d97706',
              background: 'var(--bg-surface)'
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', background: 'rgba(217, 119, 6, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
              <Coffee size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.02rem', color: 'var(--text-main)' }}>Café & Bar</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Artisan Dining Orders</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. MAIN INFORMATION HIERARCHY GRID (SECTION 6)
          Next Booking | Membership Status & Digital Card
         ======================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>

        {/* Next Booking Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 800 }}>
                NEXT SCHEDULED BOOKING
              </span>
              {upcomingBooking && <StatusBadge status="CONFIRMED" />}
            </div>

            {upcomingBooking ? (
              <div>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  {upcomingBooking.courts?.name || `Court #${upcomingBooking.court_id}`}
                </h2>
                <div style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Sport: {upcomingBooking.courts?.sport || 'Racquet Sports'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '0.5rem' }}>
                  <Calendar size={16} />
                  <span>
                    {new Date(upcomingBooking.booking_date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                  <Clock size={16} />
                  <span>
                    {upcomingBooking.start_time?.slice(0, 5)} – {upcomingBooking.end_time?.slice(0, 5)}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  No upcoming reservations scheduled for your account.
                </p>
                <button onClick={() => navigate('book')} className="btn btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
                  Book a Court Now
                </button>
              </div>
            )}
          </div>

          {upcomingBooking && (
            <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', marginTop: '1rem' }}>
              <button onClick={() => navigate('bookings')} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.88rem' }}>
                View E-Ticket
              </button>
              <button onClick={() => navigate('book')} className="btn btn-primary" style={{ flex: 1, fontSize: '0.88rem' }}>
                Book Another
              </button>
            </div>
          )}
        </div>

        {/* Digital Membership Card (Section 8) */}
        <div>
          <DigitalMembershipCard
            member={memberProfile}
            pricingCtx={pricingCtx}
            onActionClick={() => navigate('membership')}
            actionLabel={isWalkIn ? 'Upgrade to Club Membership' : 'Manage Membership Plan'}
          />
        </div>
      </div>

      {/* ========================================================
          4. RECENT ACTIVITY, NOTIFICATIONS & EVENTS (SECTION 6)
         ======================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>

        {/* Recent Orders */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 800 }}>
              RECENT CAFÉ ORDERS
            </span>
            <button onClick={() => navigate('cafe-orders')} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
              View All
            </button>
          </div>

          {recentOrders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      Order #{ord.id} • {ord.table_id ? `Table ${ord.table_id}` : 'Takeaway'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      ₹{Number(ord.total_price || 0).toFixed(2)} • {ord.payment_method || 'UPI'}
                    </div>
                  </div>
                  <StatusBadge status={ord.status} />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '1rem 0' }}>
              No recent café or dining orders recorded.
            </p>
          )}
        </div>

        {/* Notifications */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 800 }}>
              NOTIFICATIONS & ALERTS
            </span>
            <Bell size={16} color="var(--text-muted)" />
          </div>

          {notifications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: `3px solid ${n.type === 'ALERT' ? 'var(--color-danger)' : 'var(--primary)'}`
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {n.message}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '1rem 0' }}>
              You're all caught up! No active notifications.
            </p>
          )}
        </div>

        {/* Upcoming Club Events */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 800 }}>
              UPCOMING CLUB EVENTS
            </span>
            <Trophy size={16} color="var(--accent-gold)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {clubEvents.map((evt, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem',
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>{evt.tag}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{evt.date}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  {evt.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Starts at {evt.time} • Clubhouse Arena
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
