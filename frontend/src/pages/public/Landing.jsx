import React, { useState, useEffect } from 'react';
import { supabase } from '@backend/services/supabaseClient.js';
import { getPublicClubStats } from '../../services/clubPlatformService.js';
import { getProductImage } from '../../utils/productImages.js';
import { 
  Trophy, Shield, Award, Users, Calendar, ShoppingBag, 
  Coffee, ChevronRight, Menu, X, ArrowRight, CheckCircle2, Clock, MapPin, Phone, Mail
} from 'lucide-react';

export default function Landing({ navigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 1250,
    activeMembers: 1120,
    availableCourts: 14,
    sportsFacilities: 8,
    yearsOfExcellence: '12+',
    membershipPlansCount: 3,
    championshipsWon: '24+'
  });
  const [plans, setPlans] = useState([]);
  const [gearProducts, setGearProducts] = useState([]);
  const [cafeProducts, setCafeProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPublicData() {
      try {
        // 1. Dynamic Statistics
        const s = await getPublicClubStats();
        setStats(s);

        // 2. Membership Plans from database
        if (supabase) {
          const { data: plansData } = await supabase
            .from('membership_plans')
            .select('*')
            .order('id', { ascending: true });
          if (plansData && plansData.length > 0) {
            setPlans(plansData);
          } else {
            setPlans([
              { id: 1, name: 'Gold', monthly_price: 4999, court_discount: 50, shop_discount: 20, bar_discount: 15, daily_booking_limit: 3 },
              { id: 2, name: 'Silver', monthly_price: 2999, court_discount: 25, shop_discount: 10, bar_discount: 10, daily_booking_limit: 2 },
              { id: 3, name: 'Junior', monthly_price: 1999, court_discount: 35, shop_discount: 15, bar_discount: 10, daily_booking_limit: 2 }
            ]);
          }

          // 3. Public Gear and Café Products
          const { data: allProducts } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true });

          if (allProducts && allProducts.length > 0) {
            const gear = allProducts.filter(p => {
              const c = (p.category || '').toLowerCase();
              return !c.includes('café') && !c.includes('cafe') && !c.includes('drink') && !c.includes('food') && !c.includes('mocktail') && !c.includes('snack') && !c.includes('nutrition');
            }).slice(0, 6);

            const cafe = allProducts.filter(p => {
              const c = (p.category || '').toLowerCase();
              return c.includes('café') || c.includes('cafe') || c.includes('drink') || c.includes('food') || c.includes('mocktail') || c.includes('snack') || c.includes('nutrition');
            }).slice(0, 6);

            setGearProducts(gear);
            setCafeProducts(cafe);
          }
        }
      } catch (err) {
        console.warn('Could not load public landing data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPublicData();
  }, []);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const facilitiesList = [
    { title: 'Tennis Courts', sport: 'Tennis', desc: 'Championship acrylic hard courts & clay surfaces with floodlights.', badge: '4 Courts • Available' },
    { title: 'Cricket Arena', sport: 'Cricket', desc: 'Turf match pitch and automated bowling machines for nets training.', badge: 'Main Ground & 3 Nets' },
    { title: 'Badminton Courts', sport: 'Badminton', desc: 'BWF-standard non-slip synthetic courts with optimal indoor LED illumination.', badge: '3 Courts • Air Conditioned' },
    { title: 'Squash Arenas', sport: 'Squash', desc: 'WSF-approved glass-back courts with high-rebound calibrated walls.', badge: '2 Courts • Available' },
    { title: 'Padel Glass Courts', sport: 'Padel', desc: 'Super-panoramic glass courts engineered for high-energy rallies.', badge: '2 Courts • Available' },
    { title: 'Athletic Gym & Training', sport: 'Fitness', desc: 'Olympic lifting racks, cardio biomechanics, and sports rehabilitation suite.', badge: 'Open 06:00 - 23:00' },
    { title: 'Artisan Café & Bar', sport: 'Social & Dining', desc: 'Barista coffees, cold brews, wholesome paninis, and revitalizing mocktails.', badge: 'Full Service • Table Seating' },
    { title: 'Pro Gear Shop', sport: 'Merchandise', desc: 'Professional rackets, match balls, club apparel, and express stringing.', badge: 'Official Gear Desk' }
  ];

  const achievementsList = [
    { year: '2025', title: 'National Inter-Club Tennis Champions', desc: 'Kinesis Senior & Junior tennis squads clinched the National Inter-Club Trophy.' },
    { year: '2024', title: 'All-India Club Badminton Gold Cup', desc: 'Gold honors in both Mens Singles and Mixed Doubles at the National Club Invitational.' },
    { year: '2024', title: 'Premier Squash League Champions', desc: 'Undefeated season culminating in the Premier Racquets Championship banner.' },
    { year: '2023', title: 'Youth Development Excellence Award', desc: 'Recognized for cultivating over 200 state-ranked youth athletes in tennis and badminton.' },
    { year: '2026', title: 'State Padel Invitational Winners', desc: 'Inaugural state padel champions with a clean sweep in the team finals.' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      
      {/* ======================================================== */}
      {/* 1. PUBLIC NAVBAR */}
      {/* ======================================================== */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo & Name */}
          <div 
            onClick={() => scrollTo('hero')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <img
              src="/logo2.png"
              alt="Kinesis Sports Club"
              style={{ width: '42px', height: '42px', objectFit: 'contain', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.04em', color: 'var(--primary)', lineHeight: 1.1 }}>
                KINESIS
              </div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Sports & Social Club
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button onClick={() => scrollTo('hero')} className="nav-link-btn">Home</button>
            <button onClick={() => scrollTo('about')} className="nav-link-btn">About Club</button>
            <button onClick={() => scrollTo('plans')} className="nav-link-btn">Membership Plans</button>
            <button onClick={() => scrollTo('facilities')} className="nav-link-btn">Facilities</button>
            <button onClick={() => scrollTo('achievements')} className="nav-link-btn">Achievements</button>
            <button onClick={() => scrollTo('shop')} className="nav-link-btn">Gear Shop</button>
            <button onClick={() => scrollTo('cafe')} className="nav-link-btn">Café & Bar</button>
          </nav>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={() => navigate('register')} 
              style={{
                background: 'rgba(217, 119, 6, 0.1)',
                color: '#b45309',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                padding: '0.55rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Walk-in Pass
            </button>
            <button 
              onClick={() => navigate('login')} 
              className="btn btn-primary"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem', fontWeight: 600 }}
            >
              Login Portal
            </button>
            
            {/* Mobile Hamburger Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-toggle"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.4rem',
                color: 'var(--text-main)'
              }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div style={{
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-subtle)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <button onClick={() => scrollTo('hero')} className="mobile-nav-item">Home</button>
            <button onClick={() => scrollTo('about')} className="mobile-nav-item">About Club</button>
            <button onClick={() => scrollTo('plans')} className="mobile-nav-item">Membership Plans</button>
            <button onClick={() => scrollTo('facilities')} className="mobile-nav-item">Facilities</button>
            <button onClick={() => scrollTo('achievements')} className="mobile-nav-item">Achievements</button>
            <button onClick={() => scrollTo('shop')} className="mobile-nav-item">Gear Shop</button>
            <button onClick={() => scrollTo('cafe')} className="mobile-nav-item">Café & Bar</button>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => navigate('login')} className="btn btn-primary" style={{ flex: 1 }}>Login</button>
              <button onClick={() => navigate('register')} className="btn btn-secondary" style={{ flex: 1 }}>Walk-in</button>
            </div>
          </div>
        )}
      </header>

      {/* ======================================================== */}
      {/* 2. HERO SECTION */}
      {/* ======================================================== */}
      <section id="hero" style={{
        padding: '5rem 1.5rem 4rem',
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3.5rem', alignItems: 'center' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              background: 'rgba(22, 43, 35, 0.08)',
              color: 'var(--primary)',
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '1.25rem'
            }}>
              <Shield size={16} /> Elite Sports & Social Club
            </div>
            <h1 style={{
              fontSize: 'clamp(2.8rem, 5.5vw, 4.2rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              margin: '0 0 1.25rem 0',
              fontWeight: 800,
              color: 'var(--text-main)'
            }}>
              Train. Compete.<br />
              <span style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, #d4af37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Connect.
              </span>
            </h1>
            <p style={{
              fontSize: '1.15rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: '0 0 2rem 0',
              maxWidth: '560px'
            }}>
              Kinesis Sports Club brings together championship-standard courts, master athletic training, 
              curated sports equipment, artisan dining, and an exclusive member community under one unified roof.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => scrollTo('plans')}
                className="btn btn-primary"
                style={{ padding: '0.9rem 2rem', fontSize: '1.02rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                Explore Memberships <ArrowRight size={18} />
              </button>
              <button 
                onClick={() => navigate('register')}
                className="btn btn-secondary"
                style={{ padding: '0.9rem 1.75rem', fontSize: '1.02rem', fontWeight: 600 }}
              >
                Book as Walk-in
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1.75rem', marginTop: '2.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.75rem' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.availableCourts} Courts</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Racquet & Turf</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.75rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.activeMembers}+</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Club Athletes</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.75rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.yearsOfExcellence}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Years of Excellence</div>
              </div>
            </div>
          </div>

          {/* Hero Feature Visual Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.75rem', borderTop: '4px solid var(--primary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(22, 43, 35, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '1rem' }}>
                <Trophy size={22} />
              </div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.15rem' }}>Championship Courts</h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Tournament-spec Tennis, Badminton, Squash, and Padel with collision-free scheduling.
              </p>
            </div>

            <div className="card" style={{ padding: '1.75rem', borderTop: '4px solid #d4af37', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309', marginBottom: '1rem' }}>
                <Award size={22} />
              </div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.15rem' }}>Tier Privileges</h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Gold, Silver, and Junior tiers enjoying up to 50% court savings and gear discounts.
              </p>
            </div>

            <div className="card" style={{ padding: '1.75rem', borderTop: '4px solid #10b981', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '1rem' }}>
                <ShoppingBag size={22} />
              </div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.15rem' }}>Pro Gear Shop</h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Wilson, Head, Bullpadel, Yonex match gear, stringing service, and club apparel.
              </p>
            </div>

            <div className="card" style={{ padding: '1.75rem', borderTop: '4px solid #d97706', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', marginBottom: '1rem' }}>
                <Coffee size={22} />
              </div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.15rem' }}>Artisan Café & Bar</h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Post-match recovery bowls, cold brew coffee, gourmet wraps, and virgin mocktails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. CLUB STATISTICS BAR (DYNAMIC) */}
      {/* ======================================================== */}
      <section style={{
        background: 'linear-gradient(135deg, #162b23 0%, #1f3b30 100%)',
        color: '#ffffff',
        padding: '3rem 1.5rem',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '2rem',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#d4af37', fontFamily: 'var(--font-mono)' }}>
              {stats.totalMembers}+
            </div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem' }}>
              Total Members
            </div>
          </div>

          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
              {stats.activeMembers}+
            </div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem' }}>
              Active Athletes
            </div>
          </div>

          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
              {stats.sportsFacilities}
            </div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem' }}>
              Sports Facilities
            </div>
          </div>

          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              {stats.availableCourts}
            </div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem' }}>
              Available Courts
            </div>
          </div>

          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#d4af37', fontFamily: 'var(--font-mono)' }}>
              {stats.yearsOfExcellence}
            </div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem' }}>
              Years of Legacy
            </div>
          </div>

          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ec4899', fontFamily: 'var(--font-mono)' }}>
              {stats.championshipsWon}
            </div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem' }}>
              Championship Titles
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. ABOUT THE CLUB */}
      {/* ======================================================== */}
      <section id="about" style={{ padding: '5rem 1.5rem', maxWidth: '1280px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Heritage & Mission
          </span>
          <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0 0.75rem 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            About Kinesis Sports Club
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Founded to bridge elite sporting infrastructure with an inclusive social haven, Kinesis represents the zenith of sports club management.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Our History</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              Established over a decade ago, Kinesis began with 4 clay tennis courts and an ambition to foster athletic distinction. Over 12 years, the club expanded into an eight-facility campus hosting national fixtures and state tournaments.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Our Vision</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              To stand as the standard-bearer for sports club culture in India — where physical wellness, competitive ambition, and family lifestyle coexist harmoniously in a world-class environment.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Our Mission</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              Delivering transparent, collision-free court access, professional coaching mentorship, transparent pricing, and nutritious culinary nourishment for athletes of every generation.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. FACILITIES */}
      {/* ======================================================== */}
      <section id="facilities" style={{ background: 'var(--bg-surface)', padding: '5rem 1.5rem', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Infrastructure
            </span>
            <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0 0.75rem 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Club Sports Facilities
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', fontSize: '1.02rem' }}>
              Every court and sports space is calibrated to federation tournament standards.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {facilitiesList.map((f, i) => (
              <div key={i} className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {f.sport}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 600 }}>
                    {f.badge}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>{f.desc}</p>
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status: Active</span>
                  <button onClick={() => navigate('register')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    Book Court <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. ACHIEVEMENTS & CHAMPIONSHIPS */}
      {/* ======================================================== */}
      <section id="achievements" style={{ padding: '5rem 1.5rem', maxWidth: '1280px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Competitive Record
          </span>
          <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0 0.75rem 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Club Achievements & Honors
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', fontSize: '1.02rem' }}>
            A legacy forged on the court through grit, discipline, and sportsmanship.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {achievementsList.map((a, idx) => (
            <div key={idx} className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(22,43,35,0.1) 0%, rgba(212,175,55,0.2) 100%)',
                color: 'var(--primary)',
                fontWeight: 800,
                fontSize: '1rem',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)'
              }}>
                {a.year}
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.12rem', color: 'var(--text-main)' }}>{a.title}</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. MEMBERSHIP PLANS (DYNAMIC LOAD FROM DATABASE) */}
      {/* ======================================================== */}
      <section id="plans" style={{ background: 'var(--bg-surface)', padding: '5rem 1.5rem', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Transparent Tiers
            </span>
            <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0 0.75rem 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Membership Plans
            </h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', fontSize: '1.02rem' }}>
              Configured directly through club administration with guaranteed privileges.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '2rem' }}>
            {plans.map((p) => {
              const isGold = (p.name || '').toLowerCase() === 'gold';
              return (
                <div 
                  key={p.id} 
                  className="card"
                  style={{
                    padding: '2.5rem 2rem',
                    borderRadius: 'var(--radius-lg)',
                    position: 'relative',
                    border: isGold ? '2px solid #d4af37' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isGold ? '0 10px 30px rgba(212, 175, 55, 0.12)' : 'none'
                  }}
                >
                  {isGold && (
                    <div style={{
                      position: 'absolute',
                      top: '-13px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #d4af37 0%, #b45309 100%)',
                      color: '#ffffff',
                      padding: '0.25rem 1rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase'
                    }}>
                      Most Popular
                    </div>
                  )}

                  <h3 style={{ fontSize: '1.6rem', margin: '0 0 0.5rem 0', color: isGold ? '#b45309' : 'var(--text-main)' }}>
                    {p.name} Tier
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                      ₹{Number(p.monthly_price).toLocaleString('en-IN')}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/ month</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, fontSize: '0.92rem' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <span><strong>{p.court_discount}% Discount</strong> on all court bookings</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <span><strong>{p.shop_discount}% Discount</strong> at Kinesis Gear Shop</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <span><strong>{p.bar_discount}% Discount</strong> at Café & Bar</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <span><strong>{p.daily_booking_limit} Court Bookings</strong> daily limit</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <span>Priority online court scheduling access</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <span>Club tournament entry rights</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => navigate('register')}
                    className={isGold ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ width: '100%', padding: '0.85rem', fontWeight: 700, fontSize: '0.95rem' }}
                  >
                    Join {p.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. PUBLIC GEAR SHOP PREVIEW (NO MEMBER DISCOUNT SHOWN) */}
      {/* ======================================================== */}
      <section id="shop" style={{ padding: '5rem 1.5rem', maxWidth: '1280px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Official Merchandise
            </span>
            <h2 style={{ fontSize: '2.3rem', margin: '0.5rem 0 0 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Kinesis Gear Shop
            </h2>
          </div>
          <div style={{ background: 'rgba(22, 43, 35, 0.05)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            🏷️ <strong>Notice:</strong> Standard public prices shown. Club members receive up to <strong>20% discount</strong> at checkout.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem' }}>
          {gearProducts.map((p) => {
            const isOutOfStock = p.stock_quantity === 0;
            const isLowStock = !isOutOfStock && p.stock_quantity <= (p.low_stock_threshold || 5);
            return (
              <div key={p.id} className="card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  height: '200px',
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  marginBottom: '1rem',
                  position: 'relative'
                }}>
                  <img
                    src={getProductImage(p)}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '0.5rem' }}
                  />
                  {isOutOfStock ? (
                    <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#ef4444', color: '#fff', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
                      OUT OF STOCK
                    </span>
                  ) : isLowStock ? (
                    <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#f59e0b', color: '#fff', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
                      LOW STOCK ({p.stock_quantity})
                    </span>
                  ) : (
                    <span style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(16,185,129,0.9)', color: '#fff', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
                      AVAILABLE
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {p.category}
                </div>
                <h4 style={{ margin: '0.35rem 0 0.5rem 0', fontSize: '1.05rem', color: 'var(--text-main)', flex: 1 }}>
                  {p.name}
                </h4>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                      ₹{Number(p.price).toFixed(2)}
                    </span>
                  </div>
                  <button 
                    onClick={() => navigate('login')} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                  >
                    Buy via Portal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 9. PUBLIC CAFÉ & BAR PREVIEW (NO MEMBER DISCOUNT SHOWN) */}
      {/* ======================================================== */}
      <section id="cafe" style={{ background: 'var(--bg-surface)', padding: '5rem 1.5rem', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Nutrition & Social Lounge
              </span>
              <h2 style={{ fontSize: '2.3rem', margin: '0.5rem 0 0 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Artisan Café & Bar
              </h2>
            </div>
            <div style={{ background: 'rgba(22, 43, 35, 0.05)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ☕ <strong>Notice:</strong> Standard public prices shown. Club members receive up to <strong>15% discount</strong> on all food and beverages.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem' }}>
            {cafeProducts.map((p) => {
              const isOutOfStock = p.stock_quantity === 0;
              return (
                <div key={p.id} className="card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    height: '180px',
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    marginBottom: '1rem',
                    position: 'relative'
                  }}>
                    <img
                      src={getProductImage(p)}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {isOutOfStock && (
                      <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#ef4444', color: '#fff', fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>
                        OUT OF STOCK
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {p.category}
                  </div>
                  <h4 style={{ margin: '0.35rem 0 0.5rem 0', fontSize: '1.05rem', color: 'var(--text-main)', flex: 1 }}>
                    {p.name}
                  </h4>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                        ₹{Number(p.price).toFixed(2)}
                      </span>
                    </div>
                    <button 
                      onClick={() => navigate('login')} 
                      className="btn btn-secondary" 
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                    >
                      Order via Portal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 10. PUBLIC FOOTER */}
      {/* ======================================================== */}
      <footer style={{ background: '#0e1c17', color: 'rgba(255,255,255,0.7)', padding: '4rem 1.5rem 2rem', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <img src="/logo2.png" alt="Kinesis" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
              <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.05em' }}>KINESIS SPORTS CLUB</span>
            </div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.6)' }}>
              Where championship sports, athletic training, and premier community lifestyle converge under one unified destination.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Hours of Play</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="#d4af37" />
                <span>Courts: 06:00 AM – 11:00 PM Daily</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="#d4af37" />
                <span>Café & Bar: 07:00 AM – 11:30 PM Daily</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="#d4af37" />
                <span>Gear Shop: 08:00 AM – 09:00 PM Daily</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Club Complex</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <MapPin size={16} color="#d4af37" style={{ marginTop: '3px' }} />
                <span>Kinesis Sports Complex, Boulevard 7, Sports City</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} color="#d4af37" />
                <span>+91 98200 12345 / 022-48201234</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} color="#d4af37" />
                <span>concierge@kinesis.club</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Portals & Access</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
              <button onClick={() => navigate('login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', textAlign: 'left', cursor: 'pointer', padding: 0 }}>Role-Aware Login Portal</button>
              <button onClick={() => navigate('register')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', textAlign: 'left', cursor: 'pointer', padding: 0 }}>Walk-In / Member Signup</button>
              <button onClick={() => scrollTo('plans')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', textAlign: 'left', cursor: 'pointer', padding: 0 }}>Membership Tiers</button>
              <button onClick={() => scrollTo('facilities')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', textAlign: 'left', cursor: 'pointer', padding: 0 }}>Sports Facilities</button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1280px', margin: '0 auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.82rem' }}>
          <div>&copy; {new Date().getFullYear()} KINESIS SPORTS CLUB • All Rights Reserved.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Privacy Policy</span>
            <span>Terms of Club Service</span>
            <span>Safety Guidelines</span>
          </div>
        </div>
      </footer>

      {/* Inline styles for responsive button and link hover */}
      <style>{`
        .nav-link-btn {
          background: none;
          border: none;
          color: var(--text-main);
          font-size: 0.92rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0.4rem 0.2rem;
          transition: color 0.15s ease;
        }
        .nav-link-btn:hover {
          color: var(--primary);
        }
        .mobile-nav-item {
          background: none;
          border: none;
          text-align: left;
          font-size: 1rem;
          font-weight: 500;
          padding: 0.5rem 0;
          color: var(--text-main);
          cursor: pointer;
        }
        @media (max-width: 900px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-toggle {
            display: block !important;
          }
        }
      `}</style>

    </div>
  );
}
