import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { getBookings } from '@backend/services/bookingService.js';
import CurrentDate from '../../components/CurrentDate.jsx';
import { getUserPricingContext } from '../../utils/pricingEngine.js';
import { AlertCircle, Award, Sparkles, ArrowRight, Clock } from 'lucide-react';

export default function MemberHome({ navigate }) {
  const { memberProfile } = useAuth();
  const [upcomingBooking, setUpcomingBooking] = useState(null);
  const [todayUsageCount, setTodayUsageCount] = useState(0);

  // Rotating Walk-In promotional messages
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
      title: 'One booking today. More possibilities with membership.',
      desc: 'Upgrade from Walk-In to access multi-slot court reservations every day.',
      tag: 'Daily Quota'
    },
    {
      title: 'Make Kinesis your club.',
      desc: 'Explore Gold, Silver and Junior memberships tailored to your playing routine.',
      tag: 'Flexible Plans'
    },
    {
      title: 'Love the game?',
      desc: 'Members enjoy priority slots, tournament entries, and exclusive club benefits.',
      tag: 'Community'
    }
  ];

  const [promoIndex, setPromoIndex] = useState(() => Math.floor(Math.random() * PROMO_MESSAGES.length));

  useEffect(() => {
    // Subtle rotation of promo message every 12 seconds
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % PROMO_MESSAGES.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (memberProfile?.id) {
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
      });
    }
  }, [memberProfile]);

  const pricingCtx = getUserPricingContext(memberProfile);
  const { isWalkIn, isExpired, isExpiringSoon, daysRemaining, planName, dailyBookingLimit } = pricingCtx;

  const currentPromo = PROMO_MESSAGES[promoIndex];

  return (
    <div className="page-wrapper" style={{ maxWidth: '1000px', padding: 0 }}>
      {/* Top Header with Personalization and Dynamic Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>
            Welcome, {memberProfile?.name ? memberProfile.name.split(' ')[0] : 'Guest'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span
              style={{
                background: isWalkIn ? 'var(--border-subtle)' : isExpired ? '#ef4444' : 'var(--primary)',
                color: isWalkIn ? 'var(--text-main)' : 'white',
                fontSize: '0.85rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm)',
                letterSpacing: '0.04em'
              }}
            >
              {isWalkIn ? 'Walk-In Guest' : isExpired ? 'Expired Membership' : `${planName} Member`}
            </span>
            <span style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
              {isWalkIn ? 'Pay-as-you-go club access' : 'Ready for your next game at Kinesis?'}
            </span>
          </div>
        </div>

        {/* Dynamic System Date Component */}
        <CurrentDate />
      </div>

      {/* EXPIRY / RENEWAL NOTIFICATIONS */}
      {isExpired && (
        <div
          className="card"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            borderLeft: '4px solid #ef4444',
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
            <AlertCircle size={22} color="#ef4444" />
            <div>
              <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.95rem' }}>
                Your {memberProfile?.membership_plans?.name || 'Club'} Membership has expired.
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Renew to restore member pricing, preferred court booking quotas, and shop discounts.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('membership')}
            className="btn btn-primary"
            style={{ background: '#dc2626', borderColor: '#dc2626', padding: '0.55rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}
          >
            Renew Membership
          </button>
        </div>
      )}

      {isExpiringSoon && (
        <div
          className="card"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderLeft: '4px solid #f59e0b',
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
            <Clock size={22} color="#f59e0b" />
            <div>
              <div style={{ fontWeight: 700, color: '#d97706', fontSize: '0.95rem' }}>
                Your {planName} Membership expires in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}.
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Renew early to maintain continuous club privileges and member booking limits.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('membership')}
            className="btn"
            style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '0.55rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}
          >
            Renew Membership
          </button>
        </div>
      )}

      {/* WALK-IN TASTEFUL PROMOTIONAL BANNER */}
      {isWalkIn && (
        <div
          className="card animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
            border: '1px solid var(--border-subtle)',
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
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Sparkles size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: 'var(--primary)' }}>
                {currentPromo.tag}
              </span>
            </div>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
              {currentPromo.title}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {currentPromo.desc}
            </p>
          </div>

          <button
            onClick={() => navigate('membership')}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <span>Explore Memberships</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Primary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Left Column: Next Booking & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Next Booking
            </h3>
            {upcomingBooking ? (
              <div>
                <h2 style={{ marginBottom: '0.25rem' }}>{upcomingBooking.courts?.name || 'Court'}</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                  {new Date(upcomingBooking.booking_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • {upcomingBooking.start_time.slice(0, 5)} - {upcomingBooking.end_time.slice(0, 5)}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => navigate('bookings')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    View Bookings & Ticket
                  </button>
                  <button onClick={() => navigate('book')} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    Book Another
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>No upcoming reservations scheduled.</p>
                <button onClick={() => navigate('book')} className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
                  Book a Court
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Quick Actions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button onClick={() => navigate('book')} className="btn btn-secondary" style={{ padding: '0.9rem', fontSize: '0.95rem' }}>
                🎾 Book Court
              </button>
              <button onClick={() => navigate('shop')} className="btn btn-secondary" style={{ padding: '0.9rem', fontSize: '0.95rem' }}>
                🛍️ Gear & Café
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Personalized Membership & Usage Summary */}
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Account & Booking Quota
            </h3>
            <span
              style={{
                color: isWalkIn ? 'var(--text-main)' : isExpired ? '#ef4444' : '#10b981',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                fontSize: '0.78rem',
                padding: '2px 8px',
                background: isWalkIn ? 'var(--border-subtle)' : isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {isWalkIn ? 'Walk-In Guest' : isExpired ? 'Expired' : 'Active Member'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.9rem', paddingBottom: '0.9rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Membership Tier</span>
            <span style={{ fontWeight: 600 }}>{isWalkIn ? 'No Subscription' : planName}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.9rem', paddingBottom: '0.9rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Status / Validity</span>
            <span style={{ fontWeight: 500 }}>
              {isWalkIn
                ? 'Standard Guest Access'
                : memberProfile?.expiry_date
                ? new Date(memberProfile.expiry_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                : 'Active'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.9rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Today's Booking Usage</span>
            <span style={{ fontWeight: 600, color: todayUsageCount >= dailyBookingLimit ? '#ef4444' : '#10b981' }}>
              {todayUsageCount} / {dailyBookingLimit} used today
            </span>
          </div>

          {/* Privileges Display */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.6rem', fontWeight: 600 }}>
              {isWalkIn ? 'Public Guest Rates' : 'Your Tier Privileges'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              <div style={{ background: 'var(--bg-main)', padding: '0.6rem 0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {pricingCtx.courtDiscountPercent}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Courts</div>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '0.6rem 0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {pricingCtx.shopDiscountPercent}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Gear Shop</div>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '0.6rem 0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {pricingCtx.barDiscountPercent}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Café & Bar</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('membership')}
            className="btn btn-secondary"
            style={{ width: '100%', border: 'none', background: 'var(--border-subtle)', fontWeight: 600 }}
          >
            {isWalkIn ? 'Upgrade to Club Membership' : 'Manage Membership & Duration'}
          </button>
        </div>
      </div>

      {/* Member Club Activity */}
      <div className="card">
        <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          About Kinesis Sports Club
        </h3>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.92rem', lineHeight: 1.6 }}>
          Kinesis Sports Club offers world-class indoor courts for tennis, cricket, badminton, squash and padel, alongside premium sports equipment and gourmet kitchen dining.
        </p>
      </div>
    </div>
  );
}
