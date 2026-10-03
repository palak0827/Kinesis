import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ShoppingBag,
  Zap,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, lowStockCount = 0, todayBookingsCount = 0 }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'members',
      label: 'Memberships',
      icon: Users,
      badge: null
    },
    {
      id: 'bookings',
      label: 'Court Bookings',
      icon: CalendarDays,
      badge: todayBookingsCount > 0 ? `${todayBookingsCount} today` : null,
      badgeColor: '#10b981'
    },
    {
      id: 'inventory',
      label: 'Pro Shop & Stock',
      icon: ShoppingBag,
      badge: lowStockCount > 0 ? `${lowStockCount} low` : null,
      badgeColor: '#f59e0b'
    }
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0
      }}
    >
      <div>
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)',
              color: '#03140f'
            }}
          >
            <Zap size={22} strokeWidth={2.6} />
          </div>
          <div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#fff',
                lineHeight: 1.1
              }}
            >
              KINESIS
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--primary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: '2px'
              }}
            >
              Sports Club OS
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div style={{ padding: '20px 14px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-dim)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0 12px 10px'
            }}
          >
            Club Operations
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: isActive ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
                    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icon
                      size={18}
                      color={isActive ? '#10b981' : 'currentColor'}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 7px',
                        borderRadius: '999px',
                        fontWeight: 600,
                        backgroundColor: `${item.badgeColor}22`,
                        color: item.badgeColor,
                        border: `1px solid ${item.badgeColor}44`
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer System Info */}
      <div
        style={{
          padding: '18px 20px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Activity size={14} color="#10b981" />
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Kinesis Core v1.0 MVP
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
          6 Active Courts • 3 Tier Plans
          <br />
          Built for Jury Evaluation
        </div>
      </div>
    </aside>
  );
}
