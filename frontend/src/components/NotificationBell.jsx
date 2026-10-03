import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext.jsx';
import {
  getNotificationsForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  checkMembershipExpiryNotifications
} from '../services/notificationService.js';
import {
  Bell, CheckCheck, X, Clock, Calendar, ShoppingBag, Coffee,
  ShieldCheck, AlertTriangle, CheckCircle2, Info, ArrowRight, Filter, Search
} from 'lucide-react';

export default function NotificationBell() {
  const { user, role, memberProfile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fullModalOpen, setFullModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'UNREAD' | 'BOOKING' | 'ORDER' | 'PAYMENT' | 'MEMBERSHIP' | 'INVENTORY' | 'STAFF' | 'SYSTEM'
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const fetchUserNotifications = async () => {
    if (!user) return;
    try {
      if (role === 'MEMBER' && memberProfile) {
        await checkMembershipExpiryNotifications(memberProfile);
      }

      const list = await getNotificationsForUser({ user, role, limit: 100 });
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.is_read).length);
    } catch (err) {
      console.warn('Non-blocking notification fetch warning:', err);
    }
  };

  useEffect(() => {
    fetchUserNotifications();
    // Lightweight polling every 20 seconds
    const interval = setInterval(fetchUserNotifications, 20000);
    return () => clearInterval(interval);
  }, [user, role, memberProfile]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleSingleRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleReadAll = async () => {
    try {
      await markAllAsRead({ user, role });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const getNotificationIcon = (type) => {
    const t = String(type || '').toUpperCase();
    if (t === 'BOOKING') return <Calendar size={16} color="#3b82f6" />;
    if (t === 'ORDER') return <Coffee size={16} color="#d97706" />;
    if (t === 'PAYMENT') return <CheckCircle2 size={16} color="#10b981" />;
    if (t === 'MEMBERSHIP') return <ShieldCheck size={16} color="#8b5cf6" />;
    if (t === 'INVENTORY') return <ShoppingBag size={16} color="#f59e0b" />;
    if (t === 'STAFF') return <Info size={16} color="#06b6d4" />;
    if (t === 'WARNING' || t === 'MAINTENANCE') return <AlertTriangle size={16} color="#ef4444" />;
    if (t === 'SUCCESS') return <CheckCircle2 size={16} color="#10b981" />;
    return <Bell size={16} color="var(--primary)" />;
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'Just now';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filtered list for full modal
  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'UNREAD' && n.is_read) return false;
    if (filterType !== 'ALL' && filterType !== 'UNREAD' && n.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      
      {/* Bell Trigger Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        title="Notifications"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '50%',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: unreadCount > 0 ? 'var(--primary)' : 'var(--text-muted)',
          position: 'relative',
          transition: 'all 0.15s ease'
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            background: '#ef4444',
            color: '#ffffff',
            borderRadius: '999px',
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '1px 5px',
            minWidth: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.35)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Panel */}
      {dropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '46px',
          right: 0,
          width: '340px',
          maxWidth: 'calc(100vw - 2rem)',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.15)',
          border: '1px solid var(--border-subtle)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-main)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '999px', fontWeight: 700 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleReadAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List (Max 5 in preview) */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>🔔</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>You're all caught up!</div>
                <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>No new notifications at the moment.</div>
              </div>
            ) : (
              notifications.slice(0, 6).map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleSingleRead(n.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: n.is_read ? 'transparent' : 'rgba(22, 43, 35, 0.04)',
                    cursor: n.is_read ? 'default' : 'pointer',
                    display: 'flex',
                    gap: '0.65rem',
                    alignItems: 'flex-start',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: 'var(--bg-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {getNotificationIcon(n.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: n.is_read ? 500 : 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {n.message}
                    </p>
                  </div>

                  {!n.is_read && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: '8px' }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer View All */}
          <div style={{
            padding: '0.6rem',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-main)',
            textAlign: 'center'
          }}>
            <button
              onClick={() => { setDropdownOpen(false); setFullModalOpen(true); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              View All Notifications ({notifications.length}) <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FULL NOTIFICATIONS MODAL (PART 23) */}
      {/* ======================================================== */}
      {fullModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '1rem'
        }}>
          <div className="card" style={{
            maxWidth: '680px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: '0 20px 45px rgba(0,0,0,0.25)'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-surface)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Notification Center</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {role?.toUpperCase()} Activity & Operational Alerts
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {unreadCount > 0 && (
                  <button onClick={handleReadAll} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}>
                    <CheckCheck size={14} style={{ marginRight: '4px' }} /> Mark all read
                  </button>
                )}
                <button onClick={() => setFullModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filter Bar & Search */}
            <div style={{
              padding: '0.85rem 1.75rem',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-main)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '2px' }}>
                {['ALL', 'UNREAD', 'BOOKING', 'ORDER', 'PAYMENT', 'MEMBERSHIP', 'INVENTORY', 'STAFF', 'SYSTEM'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '999px',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: filterType === f ? 'var(--primary)' : 'var(--bg-surface)',
                      color: filterType === f ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', padding: '0 0.65rem' }}>
                <Search size={15} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Filter notifications by keyword..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.82rem',
                    width: '100%',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.75rem' }}>
              {filteredNotifications.length === 0 ? (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>No notifications found</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>There are no alerts matching your active filter.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filteredNotifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && handleSingleRead(n.id)}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: n.is_read ? 'var(--bg-surface)' : 'rgba(22, 43, 35, 0.05)',
                        border: n.is_read ? '1px solid var(--border-subtle)' : '1px solid rgba(22, 43, 35, 0.2)',
                        display: 'flex',
                        gap: '0.85rem',
                        alignItems: 'flex-start',
                        cursor: n.is_read ? 'default' : 'pointer'
                      }}
                    >
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: 'var(--bg-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {getNotificationIcon(n.type)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                            {n.title}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {n.message}
                        </p>
                      </div>

                      {!n.is_read && (
                        <button
                          onClick={(e) => handleSingleRead(n.id, e)}
                          title="Mark read"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
