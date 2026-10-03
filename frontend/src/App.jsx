import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import Landing from './pages/public/Landing.jsx';
import Login from './pages/public/Login.jsx';
import Register from './pages/public/Register.jsx';
import MemberHome from './pages/member/Home.jsx';
import BookCourt from './pages/member/BookCourt.jsx';
import MemberBookings from './pages/member/Bookings.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Members from './pages/Members.jsx';
import Bookings from './pages/Bookings.jsx';
import Inventory from './pages/Inventory.jsx';

function ThemeToggle() {
  const [theme, setTheme] = useState(localStorage.getItem('kinesis_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kinesis_theme', theme);
  }, [theme]);

  const toggle = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <button onClick={toggle} style={{
      background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '50%',
      width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: 'var(--text-main)'
    }}>
      {theme === 'light' ? '☾' : '☀'}
    </button>
  );
}

export default function App() {
  const { user, role, loading } = useAuth();
  const [route, setRoute] = useState('landing');

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  const navigate = (r) => setRoute(r);

  const renderPublic = () => {
    if (route === 'login') return <Login navigate={navigate} />;
    if (route === 'register') return <Register navigate={navigate} />;
    return <Landing navigate={navigate} />;
  };

  const renderMember = () => {
    let content;
    if (route === 'book') content = <BookCourt navigate={navigate} />;
    else if (route === 'bookings') content = <MemberBookings navigate={navigate} />;
    else content = <MemberHome navigate={navigate} />;

    return (
      <div>
        <nav style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
          <h2 style={{ margin: 0, cursor: 'pointer' }} onClick={() => navigate('home')}>KINESIS</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => navigate('home')} className="btn btn-secondary" style={{border: 'none'}}>Home</button>
            <button onClick={() => navigate('bookings')} className="btn btn-secondary" style={{border: 'none'}}>Bookings</button>
            <ThemeToggle />
          </div>
        </nav>
        {content}
      </div>
    );
  };

  const renderAdmin = () => (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: '240px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', padding: '2rem 1rem' }}>
        <h3 style={{ marginBottom: '2rem', paddingLeft: '1rem' }}>KINESIS ADMIN</h3>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {['dashboard', 'members', 'bookings', 'inventory'].map(item => (
            <li key={item}>
              <button 
                onClick={() => navigate(item)} 
                className="btn btn-secondary" 
                style={{ width: '100%', textAlign: 'left', border: 'none', background: route === item ? 'var(--border-subtle)' : 'transparent', borderRadius: 'var(--radius-sm)' }}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 'auto', paddingTop: '2rem', paddingLeft: '1rem' }}>
          <ThemeToggle />
        </div>
      </div>
      <div style={{ flex: 1, padding: '2rem', background: 'var(--bg-main)' }}>
        {route === 'dashboard' && <Dashboard />}
        {route === 'members' && <Members />}
        {route === 'bookings' && <Bookings />}
        {route === 'inventory' && <Inventory />}
        {!['dashboard', 'members', 'bookings', 'inventory'].includes(route) && <Dashboard />}
      </div>
    </div>
  );

  if (!user) return (
    <>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}><ThemeToggle /></div>
      {renderPublic()}
    </>
  );
  if (role === 'MEMBER') return renderMember();
  if (role === 'ADMIN') return renderAdmin();

  return <div>Unknown role</div>;
}
