import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import Landing from './pages/public/Landing.jsx';
import Login from './pages/public/Login.jsx';
import Register from './pages/public/Register.jsx';
import ForgotPassword from './pages/public/ForgotPassword.jsx';
import ResetPassword from './pages/public/ResetPassword.jsx';
import MemberHome from './pages/member/Home.jsx';
import BookCourt from './pages/member/BookCourt.jsx';
import MemberBookings from './pages/member/Bookings.jsx';
import MemberMembership from './pages/member/Membership.jsx';
import MemberShop from './pages/member/Shop.jsx';
import MemberProfile from './pages/member/Profile.jsx';

import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminCourts from './pages/admin/Courts.jsx';
import AdminInventory from './pages/admin/Inventory.jsx';
import AdminOperations from './pages/admin/Operations.jsx';

const MEMBER_ROUTES = ['home', 'book', 'bookings', 'membership', 'shop', 'profile'];
const ADMIN_ROUTES = ['admin-dashboard', 'admin-courts', 'admin-inventory', 'admin-operations', 'admin-settings'];

function getRouteFromPath(pathname) {
  const p = (pathname || '').toLowerCase().replace(/\/$/, '');
  if (p === '' || p === '/') return 'landing';
  if (p === '/login') return 'login';
  if (p === '/register') return 'register';
  if (p === '/forgot-password') return 'forgot-password';
  if (p === '/reset-password') return 'reset-password';
  if (p === '/member' || p === '/home') return 'home';
  if (p === '/book') return 'book';
  if (p === '/bookings') return 'bookings';
  if (p === '/membership') return 'membership';
  if (p === '/shop') return 'shop';
  if (p === '/profile') return 'profile';
  if (p === '/admin' || p === '/admin-dashboard') return 'admin-dashboard';
  if (p === '/admin/courts' || p === '/admin-courts') return 'admin-courts';
  if (p === '/admin/inventory' || p === '/admin-inventory') return 'admin-inventory';
  if (p === '/admin/operations' || p === '/admin-operations') return 'admin-operations';
  if (p === '/admin/settings' || p === '/admin-settings') return 'admin-settings';
  return 'landing';
}

function getPathFromRoute(r) {
  if (r === 'landing') return '/';
  if (r === 'home') return '/member';
  if (r === 'admin-dashboard') return '/admin';
  return `/${r}`;
}

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

  // Sync browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Strict session-based route protection
  useEffect(() => {
    if (loading) return;

    const path = window.location.pathname.toLowerCase();

    if (!user) {
      // No session -> protect /member/* and /admin/*
      if (
        MEMBER_ROUTES.includes(route) ||
        ADMIN_ROUTES.includes(route) ||
        path.startsWith('/member') ||
        path.startsWith('/admin')
      ) {
        navigate('login', true);
      }
    } else if (role?.toUpperCase() === 'MEMBER') {
      // Member session -> protect /admin/*
      if (ADMIN_ROUTES.includes(route) || path.startsWith('/admin')) {
        navigate('home', true);
      } else if (route === 'login' || route === 'register') {
        navigate('home', true);
      }
    } else if (role?.toUpperCase() === 'ADMIN') {
      // Admin session -> protect /member/*
      if (MEMBER_ROUTES.includes(route) || path.startsWith('/member')) {
        navigate('admin-dashboard', true);
      } else if (route === 'login' || route === 'register') {
        navigate('admin-dashboard', true);
      }
    }
  }, [user, role, loading, route]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
        Loading Kinesis Sports Club...
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

  const renderMember = () => {
    let content;
    if (route === 'book') content = <BookCourt navigate={navigate} />;
    else if (route === 'bookings') content = <MemberBookings navigate={navigate} />;
    else if (route === 'membership') content = <MemberMembership navigate={navigate} />;
    else if (route === 'shop') content = <MemberShop navigate={navigate} />;
    else if (route === 'profile') content = <MemberProfile navigate={navigate} />;
    else content = <MemberHome navigate={navigate} />;

    const SidebarButton = ({ path, label }) => (
      <button 
        onClick={() => navigate(path)} 
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '0.75rem 1rem',
          background: route === path || (route === 'home' && path === 'home') ? 'var(--border-subtle)' : 'transparent',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: 'var(--text-main)',
          fontSize: '0.95rem',
          fontWeight: route === path ? 600 : 400,
          transition: 'background 0.2s ease'
        }}>
        {label}
      </button>
    );

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
        {/* Sidebar */}
        <div style={{ width: '260px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 2rem 0', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('home')}>
            KINESIS<br/>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Sports Club</span>
          </h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Home</div>
            <SidebarButton path="home" label="Dashboard" />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Play</div>
            <SidebarButton path="book" label="Book Court" />
            <SidebarButton path="bookings" label="My Bookings" />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Membership</div>
            <SidebarButton path="membership" label="My Membership" />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Club</div>
            <SidebarButton path="shop" label="Shop" />
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            <SidebarButton path="profile" label="Profile" />
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
                fontSize: '0.95rem',
                fontWeight: 500
              }}
            >
              Logout
            </button>
            <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}><ThemeToggle /></div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
          {content}
        </div>
      </div>
    );
  };

  const renderAdmin = () => {
    let content;
    if (route === 'admin-courts') content = <AdminCourts navigate={navigate} />;
    else if (route === 'admin-inventory') content = <AdminInventory navigate={navigate} />;
    else if (route === 'admin-operations') content = <AdminOperations navigate={navigate} />;
    else content = <AdminDashboard navigate={navigate} />;

    const SidebarButton = ({ path, label }) => (
      <button 
        onClick={() => navigate(path)} 
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '0.75rem 1rem',
          background: route === path || (!route.startsWith('admin-') && path === 'admin-dashboard') ? 'var(--border-subtle)' : 'transparent',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: 'var(--text-main)',
          fontSize: '0.95rem',
          fontWeight: route === path ? 600 : 400,
          transition: 'background 0.2s ease'
        }}>
        {label}
      </button>
    );

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ width: '260px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 2rem 0', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('admin-dashboard')}>
            KINESIS<br/>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>ADMIN</span>
          </h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Main</div>
            <SidebarButton path="admin-dashboard" label="Dashboard" />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Management</div>
            <SidebarButton path="admin-courts" label="Courts" />
            <SidebarButton path="admin-inventory" label="Inventory" />
            <SidebarButton path="admin-operations" label="Operations" />
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
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
                fontSize: '0.95rem',
                fontWeight: 500
              }}
            >
              Logout
            </button>
            <div style={{ marginTop: '1rem', paddingLeft: '1rem' }}><ThemeToggle /></div>
          </div>
        </div>
        
        <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
          {content}
        </div>
      </div>
    );
  };

  // If unauthenticated, show public pages
  if (!user) {
    return (
      <>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
          <ThemeToggle />
        </div>
        {renderPublic()}
      </>
    );
  }

  // Role-based views
  if (role?.toUpperCase() === 'MEMBER') return renderMember();
  if (role?.toUpperCase() === 'ADMIN') return renderAdmin();

  return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <h2>Unknown session role</h2>
      <button onClick={handleLogout} className="btn btn-primary" style={{ marginTop: '1rem' }}>
        Return to Login
      </button>
    </div>
  );
}
