import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import Landing from './pages/public/Landing.jsx';
import Login from './pages/public/Login.jsx';
import Register from './pages/public/Register.jsx';
import ForgotPassword from './pages/public/ForgotPassword.jsx';
import ResetPassword from './pages/public/ResetPassword.jsx';
import NotificationBell from './components/NotificationBell.jsx';

// Member Portal Pages
import MemberHome from './pages/member/Home.jsx';
import BookCourt from './pages/member/BookCourt.jsx';
import MemberBookings from './pages/member/Bookings.jsx';
import MemberMembership from './pages/member/Membership.jsx';
import MemberShop from './pages/member/Shop.jsx';
import MemberCafeOrders from './pages/member/CafeOrders.jsx';
import MemberProfile from './pages/member/Profile.jsx';
import PurchaseHistory from './pages/member/PurchaseHistory.jsx';

// Dedicated Operational Portals
import RestaurantPortal from './pages/restaurant/RestaurantPortal.jsx';
import BarPortal from './pages/bar/BarPortal.jsx';
import ShopManagerPortal from './pages/shopManager/ShopManagerPortal.jsx';
import CourtManagerPortal from './pages/courtManager/CourtManagerPortal.jsx';
import StaffManagerPortal from './pages/staffManager/StaffManagerPortal.jsx';
import ReceptionPortal from './pages/reception/ReceptionPortal.jsx';

// Admin Portal Pages
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminCourts from './pages/admin/Courts.jsx';
import AdminInventory from './pages/admin/Inventory.jsx';
import AdminOperations from './pages/admin/Operations.jsx';
import AdminKitchen from './pages/admin/Kitchen.jsx';
import AdminMembers from './pages/Members.jsx';
import AdminAnalytics from './pages/admin/Analytics.jsx';
import AdminTables from './pages/admin/Tables.jsx';
import AdminOffersAndPlans from './pages/admin/AdminOffersAndPlans.jsx';

// Legacy Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard.jsx';
import StaffInventory from './pages/staff/StaffInventory.jsx';
import StaffTables from './pages/staff/StaffTables.jsx';

import AccessDenied from './components/AccessDenied.jsx';
import {
  ROLES,
  PUBLIC_ROUTES,
  MEMBER_ROUTES,
  RESTAURANT_ROUTES,
  BAR_ROUTES,
  SHOP_ROUTES,
  COURT_ROUTES,
  STAFF_ROUTES,
  RECEPTION_ROUTES,
  ADMIN_ROUTES,
  isPublicRoute,
  isProtectedRoute,
  isRouteAuthorized,
  getDefaultRouteForRole,
  getRouteFromPath,
  getPathFromRoute
} from './utils/routeSecurity.js';

function ThemeToggle() {
  const [theme, setTheme] = useState(localStorage.getItem('kinesis_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kinesis_theme', theme);
  }, [theme]);

  const toggle = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <button
      onClick={toggle}
      title="Toggle Theme"
      style={{
        background: 'none',
        border: '1px solid var(--border-subtle)',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-main)'
      }}
    >
      {theme === 'light' ? '☾' : '☀'}
    </button>
  );
}

const DEPARTMENT_CUES = {
  RESTAURANT: { icon: '🍽️', label: 'Dining Operations', bg: 'rgba(245, 158, 11, 0.12)', color: '#b45309' },
  BAR: { icon: '🍸', label: 'Beverage Operations', bg: 'rgba(217, 119, 6, 0.12)', color: '#b45309' },
  SHOP_MANAGER: { icon: '🛍️', label: 'Retail & Gear', bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' },
  COURT_MANAGER: { icon: '🎾', label: 'Sports Scheduling', bg: 'rgba(13, 59, 46, 0.08)', color: 'var(--primary)' },
  STAFF_MANAGER: { icon: '👥', label: 'Workforce & HR', bg: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5' },
  STAFF: { icon: '👥', label: 'Club Workforce', bg: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5' },
  RECEPTIONIST: { icon: '🛎️', label: 'Front Desk Operations', bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' },
  ADMIN: { icon: '⚡', label: 'Executive Control', bg: 'rgba(197, 168, 105, 0.18)', color: '#b45309' },
  MEMBER: { icon: '🏅', label: 'Athlete Portal', bg: 'rgba(13, 59, 46, 0.08)', color: 'var(--primary)' }
};

function PortalHeader({ title, user, role, onProfileClick }) {
  const cue = DEPARTMENT_CUES[role] || DEPARTMENT_CUES.MEMBER;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.85rem 2rem',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <img
          src="/logo2.png"
          alt="Kinesis"
          style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0 }}
        />
        <span style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--primary)', textTransform: 'uppercase' }}>
          KINESIS SPORTS CLUB
        </span>
        <span style={{ color: 'var(--border-subtle)', fontSize: '0.9rem' }}>/</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {title}
        </span>

        {/* Section 14: Department Visual Cue */}
        {cue && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              background: cue.bg,
              color: cue.color,
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <span>{cue.icon}</span>
            <span>{cue.label}</span>
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <NotificationBell />
        <ThemeToggle />
        <div
          onClick={onProfileClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: onProfileClick ? 'pointer' : 'default',
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#d4af37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.78rem'
          }}>
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {user?.name || user?.email?.split('@')[0]}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {role?.replace('_', ' ').toLowerCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const { user, role, loading, logout } = useAuth();
  const [route, setRoute] = useState(() => getRouteFromPath(window.location.pathname));

  const navigate = (r, replace = false) => {
    setRoute(r);
    const path = getPathFromRoute(r);
    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Centralized, strict role guards preventing unauthorized or unauthenticated access
  useEffect(() => {
    if (loading) return;

    // 1. Unauthenticated users cannot access private portals
    if (!user) {
      if (isProtectedRoute(route)) {
        try {
          sessionStorage.setItem('kinesis_redirect_after_login', window.location.pathname);
          if (!sessionStorage.getItem('kinesis_auth_message')) {
            sessionStorage.setItem('kinesis_auth_message', 'Login Required: Please sign in to access this portal.');
          }
        } catch {}
        navigate('login', true);
      }
      return;
    }

    // 2. Authenticated users attempting login/register are redirected to their authorized dashboard
    if (route === 'login' || route === 'register') {
      const defaultRoute = getDefaultRouteForRole(role);
      navigate(defaultRoute, true);
    }
  }, [user, role, loading, route]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: 'var(--text-main)',
        gap: '1.25rem'
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'var(--primary)',
          color: '#d4af37',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1.6rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }}>
          K
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2.5px solid var(--border-subtle)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
            Checking session & permissions...
          </span>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('login', true);
  };

  const renderPublic = () => {
    if (route === 'login') return <Login navigate={navigate} />;
    if (route === 'register') return <Register navigate={navigate} />;
    if (route === 'forgot-password') return <ForgotPassword navigate={navigate} />;
    if (route === 'reset-password') return <ResetPassword navigate={navigate} />;
    return <Landing navigate={navigate} />;
  };

  const SidebarButton = ({ path, label, active = false }) => (
    <button 
      onClick={() => navigate(path)} 
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '0.75rem 1rem',
        background: active ? 'var(--border-subtle)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: 'var(--text-main)',
        fontSize: '0.92rem',
        fontWeight: active ? 700 : 400,
        transition: 'background 0.2s ease',
        display: 'block'
      }}>
      {label}
    </button>
  );

  const SidebarBrand = ({ subtitle, path = 'home' }) => (
    <div
      onClick={() => navigate(path)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.75rem',
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      <img
        src="/logo2.png"
        alt="Kinesis Logo"
        style={{ width: '40px', height: '40px', objectFit: 'contain', flexShrink: 0 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--primary)', lineHeight: 1 }}>
          KINESIS
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
          {subtitle}
        </span>
      </div>
    </div>
  );

  const renderMember = () => {
    let content;
    if (route === 'book') content = <BookCourt navigate={navigate} />;
    else if (route === 'bookings') content = <MemberBookings navigate={navigate} />;
    else if (route === 'membership') content = <MemberMembership navigate={navigate} />;
    else if (route === 'shop') content = <MemberShop navigate={navigate} />;
    else if (route === 'cafe-orders') content = <MemberCafeOrders navigate={navigate} />;
    else if (route === 'purchase-history') content = <PurchaseHistory navigate={navigate} />;
    else if (route === 'profile') content = <MemberProfile navigate={navigate} />;
    else content = <MemberHome navigate={navigate} />;

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ width: '260px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
          <SidebarBrand subtitle="Member Portal" path="home" />
          
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.4rem', fontWeight: 600 }}>Home</div>
            <SidebarButton path="home" label="Member Dashboard" active={route === 'home'} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.4rem', fontWeight: 600 }}>Play Courts</div>
            <SidebarButton path="book" label="Book a Court" active={route === 'book'} />
            <SidebarButton path="bookings" label="My Bookings & Tickets" active={route === 'bookings'} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.4rem', fontWeight: 600 }}>Club Privileges</div>
            <SidebarButton path="membership" label="My Membership" active={route === 'membership'} />
            <SidebarButton path="shop" label="Shop & Café" active={route === 'shop'} />
            <SidebarButton path="cafe-orders" label="My Café Orders" active={route === 'cafe-orders'} />
            <SidebarButton path="purchase-history" label="Purchase History" active={route === 'purchase-history'} />
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <SidebarButton path="profile" label="My Profile" active={route === 'profile'} />
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.75rem 1rem',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.92rem',
                fontWeight: 600
              }}
            >
              Sign Out
            </button>
            <div style={{ marginTop: '0.75rem', paddingLeft: '1rem' }}><ThemeToggle /></div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <PortalHeader title="Member Portal" user={user} role={role} onProfileClick={() => navigate('profile')} />
          <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
            {content}
          </div>
        </div>
      </div>
    );
  };


  const renderRestaurant = () => (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div style={{ width: '260px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <SidebarBrand subtitle="Restaurant Manager" path="restaurant-dashboard" />
        <SidebarButton path="restaurant-dashboard" label="Dining Floor & Orders" active={true} />
        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Sign Out</button>
          <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}><ThemeToggle /></div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <PortalHeader title="Restaurant Operations" user={user} role={role} />
        <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
          <RestaurantPortal navigate={navigate} />
        </div>
      </div>
    </div>
  );

  const renderBar = () => (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div style={{ width: '260px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <SidebarBrand subtitle="Bar Manager" path="bar-dashboard" />
        <SidebarButton path="bar-dashboard" label="Bar & Cellar Operations" active={true} />
        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Sign Out</button>
          <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}><ThemeToggle /></div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <PortalHeader title="Bar Operations" user={user} role={role} />
        <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
          <BarPortal navigate={navigate} />
        </div>
      </div>
    </div>
  );

  const renderShop = () => (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div style={{ width: '260px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <SidebarBrand subtitle="Gear Shop Manager" path="shop-dashboard" />
        <SidebarButton path="shop-dashboard" label="Pro Gear Inventory & Sales" active={true} />
        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Sign Out</button>
          <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}><ThemeToggle /></div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <PortalHeader title="Gear Shop Operations" user={user} role={role} />
        <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
          <ShopManagerPortal navigate={navigate} />
        </div>
      </div>
    </div>
  );

  const renderCourt = () => (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div style={{ width: '260px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <SidebarBrand subtitle="Court Manager" path="court-dashboard" />
        <SidebarButton path="court-dashboard" label="Courts & E-Ticket Desk" active={true} />
        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Sign Out</button>
          <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}><ThemeToggle /></div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <PortalHeader title="Court Operations" user={user} role={role} />
        <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
          <CourtManagerPortal navigate={navigate} />
        </div>
      </div>
    </div>
  );

  const renderStaff = () => (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div style={{ width: '260px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <SidebarBrand subtitle="Personal Staff & HR" path="staff-dashboard" />
        <SidebarButton path="staff-dashboard" label="Personal Staff Hub" active={route === 'staff-dashboard'} />
        <SidebarButton path="staff-inventory" label="Inventory Overview" active={route === 'staff-inventory'} />
        <SidebarButton path="staff-tables" label="Café Tables" active={route === 'staff-tables'} />
        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Sign Out</button>
          <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}><ThemeToggle /></div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <PortalHeader title="Personal Staff & HR Hub" user={user} role={role} />
        <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
          {route === 'staff-inventory' ? <StaffInventory navigate={navigate} /> :
           route === 'staff-tables' ? <StaffTables navigate={navigate} /> :
           <StaffDashboard user={user} role={role} navigate={navigate} />}
        </div>
      </div>
    </div>
  );

  const renderReception = () => (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div style={{ width: '260px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <SidebarBrand subtitle="Reception Desk" path="reception-dashboard" />
        <SidebarButton path="reception-dashboard" label="Front Desk & Registration" active={true} />
        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>Sign Out</button>
          <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}><ThemeToggle /></div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <PortalHeader title="Reception Operations" user={user} role={role} />
        <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
          <ReceptionPortal navigate={navigate} />
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => {
    let content;
    if (route === 'admin-courts') content = <AdminCourts navigate={navigate} />;
    else if (route === 'admin-inventory') content = <AdminInventory navigate={navigate} />;
    else if (route === 'admin-operations') content = <AdminOperations navigate={navigate} />;
    else if (route === 'admin-kitchen') content = <AdminKitchen navigate={navigate} />;
    else if (route === 'admin-members') content = <AdminMembers navigate={navigate} />;
    else if (route === 'admin-analytics') content = <AdminAnalytics navigate={navigate} />;
    else if (route === 'admin-tables') content = <AdminTables navigate={navigate} />;
    else if (route === 'admin-offers') content = <AdminOffersAndPlans navigate={navigate} />;
    else if (route === 'restaurant-dashboard') content = <RestaurantPortal navigate={navigate} />;
    else if (route === 'bar-dashboard') content = <BarPortal navigate={navigate} />;
    else if (route === 'shop-dashboard') content = <ShopManagerPortal navigate={navigate} />;
    else if (route === 'court-dashboard') content = <CourtManagerPortal navigate={navigate} />;
    else if (route === 'staff-dashboard') content = <StaffManagerPortal navigate={navigate} />;
    else if (route === 'reception-dashboard') content = <ReceptionPortal navigate={navigate} />;
    else content = <AdminDashboard navigate={navigate} />;

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ width: '270px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
          <SidebarBrand subtitle="Executive Admin" path="admin-dashboard" />
          
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.35rem', fontWeight: 700 }}>Executive</div>
            <SidebarButton path="admin-dashboard" label="Financial Dashboard" active={route === 'admin-dashboard'} />
            <SidebarButton path="admin-analytics" label="Revenue Analytics" active={route === 'admin-analytics'} />
            <SidebarButton path="admin-offers" label="Offers, Plans & Audit" active={route === 'admin-offers'} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.35rem', fontWeight: 700 }}>Club Portals</div>
            <SidebarButton path="reception-dashboard" label="Reception Portal" active={route === 'reception-dashboard'} />
            <SidebarButton path="court-dashboard" label="Court Management" active={route === 'court-dashboard'} />
            <SidebarButton path="restaurant-dashboard" label="Restaurant Portal" active={route === 'restaurant-dashboard'} />
            <SidebarButton path="bar-dashboard" label="Bar Portal" active={route === 'bar-dashboard'} />
            <SidebarButton path="shop-dashboard" label="Gear Shop Portal" active={route === 'shop-dashboard'} />
            <SidebarButton path="staff-dashboard" label="Staff / HR Portal" active={route === 'staff-dashboard'} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.35rem', fontWeight: 700 }}>Core Records</div>
            <SidebarButton path="admin-members" label="Members Directory" active={route === 'admin-members'} />
            <SidebarButton path="admin-kitchen" label="Orders & Kitchen" active={route === 'admin-kitchen'} />
            <SidebarButton path="admin-operations" label="Daily Operations" active={route === 'admin-operations'} />
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.65rem 1rem',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.92rem',
                fontWeight: 600
              }}
            >
              Sign Out
            </button>
            <div style={{ marginTop: '0.75rem', paddingLeft: '1rem' }}><ThemeToggle /></div>
          </div>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <PortalHeader title="Executive Administration" user={user} role={role} />
          <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
            {content}
          </div>
        </div>
      </div>
    );
  };


  // 1. Unauthenticated users: strictly block all protected routes
  if (!user) {
    if (isProtectedRoute(route)) {
      try {
        sessionStorage.setItem('kinesis_redirect_after_login', window.location.pathname);
        if (!sessionStorage.getItem('kinesis_auth_message')) {
          sessionStorage.setItem('kinesis_auth_message', 'Login Required: Please sign in to access this portal.');
        }
        window.history.replaceState({}, '', '/login');
      } catch {}

      return (
        <>
          <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 110 }}>
            <ThemeToggle />
          </div>
          <Login navigate={navigate} />
        </>
      );
    }

    return (
      <>
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 110 }}>
          <ThemeToggle />
        </div>
        {renderPublic()}
      </>
    );
  }

  // 2. Authenticated users: if visiting login/register, redirect to authorized dashboard
  if (route === 'login' || route === 'register') {
    const defaultRoute = getDefaultRouteForRole(role);
    window.history.replaceState({}, '', getPathFromRoute(defaultRoute));
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        Redirecting to authorized dashboard...
      </div>
    );
  }

  // 3. Authenticated users visiting public landing
  if (route === 'landing') {
    return (
      <>
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 110 }}>
          <ThemeToggle />
        </div>
        {renderPublic()}
      </>
    );
  }

  // 4. Role Authorization Guard: Verify CURRENT role has permission for the requested route
  if (!isRouteAuthorized(role, route)) {
    return (
      <AccessDenied
        user={user}
        role={role}
        targetRoute={route}
        navigate={navigate}
        onLogout={handleLogout}
      />
    );
  }

  // 5. Authorized Portal Renderers for the 8 authorized roles
  const r = (role || '').toUpperCase();
  if (r === 'MEMBER') return renderMember();
  if (r === 'RESTAURANT_MANAGER') return renderRestaurant();
  if (r === 'BAR_MANAGER') return renderBar();
  if (r === 'SHOP_MANAGER') return renderShop();
  if (r === 'COURT_MANAGER') return renderCourt();
  if (r === 'STAFF_MANAGER' || r === 'STAFF') return renderStaff();
  if (r === 'RECEPTION') return renderReception();
  if (r === 'ADMIN') return renderAdmin();

  return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <h2>Unknown session role</h2>
      <button onClick={handleLogout} className="btn btn-primary" style={{ marginTop: '1rem' }}>
        Return to Login
      </button>
    </div>
  );
}
