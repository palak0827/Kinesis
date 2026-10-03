import React, { useState, useEffect } from 'react';
import { getCafeTables, updateTableStatus, calculateTableSummary } from '@backend/services/cafeTableService.js';
import { Utensils, CheckCircle, Clock, AlertTriangle, XCircle, Search, Filter, Edit3, UserCheck, Shield } from 'lucide-react';

export default function CafeTableManager({ canManage = true }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Status edit modal state
  const [editingTable, setEditingTable] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [reservedBy, setReservedBy] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const loadTables = async () => {
    setLoading(true);
    try {
      const data = await getCafeTables();
      setTables(data || []);
    } catch (e) {
      console.error('Failed to load café tables:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const summary = calculateTableSummary(tables);

  const openStatusEditor = (table) => {
    if (!canManage) return;
    setEditingTable(table);
    setNewStatus(table.status);
    setReservedBy(table.reserved_by || '');
    setReservationTime(table.reservation_time || '07:00 PM');
    setPartySize(table.party_size || table.capacity || 2);
    setNotes(table.notes || '');
  };

  const handleStatusChangeRequest = (e) => {
    e.preventDefault();
    if (!newStatus || newStatus === editingTable.status) {
      setEditingTable(null);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!editingTable || !newStatus) return;
    setIsSubmitting(true);
    try {
      const resData = newStatus === 'RESERVED' ? {
        reserved_by: reservedBy.trim() || 'Club Guest',
        reservation_time: reservationTime,
        party_size: partySize,
        notes: notes.trim()
      } : null;

      await updateTableStatus(editingTable.id, newStatus, resData);
      await loadTables();
      setShowConfirmModal(false);
      setEditingTable(null);
    } catch (err) {
      alert(err.message || 'Failed to update table status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & Search
  const filteredTables = tables.filter(t => {
    const s = String(t.status || '').toUpperCase();
    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      matchesStatus = s === statusFilter;
    }

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      t.table_number?.toLowerCase().includes(q) ||
      t.table_name?.toLowerCase().includes(q) ||
      t.reserved_by?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '999px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <CheckCircle size={12} /> AVAILABLE
          </span>
        );
      case 'RESERVED':
        return (
          <span style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '999px',
            background: 'rgba(217, 119, 6, 0.12)',
            color: '#d97706',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={12} /> RESERVED
          </span>
        );
      case 'OCCUPIED':
        return (
          <span style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '999px',
            background: 'rgba(59, 130, 246, 0.12)',
            color: '#3b82f6',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <UserCheck size={12} /> OCCUPIED
          </span>
        );
      case 'UNDER_MAINTENANCE':
        return (
          <span style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '999px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#ef4444',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <AlertTriangle size={12} /> UNDER MAINTENANCE
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Utensils size={24} color="var(--primary)" />
            Café & Bar Table Management
          </h2>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Live physical floor seating, occupancy monitoring, and reservation status
          </p>
        </div>
        <button
          onClick={loadTables}
          className="btn btn-outline"
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
        >
          ↻ Refresh Tables
        </button>
      </div>

      {/* UPDATE 3: CAFÉ & BAR TABLE STATUS SUMMARY */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Total Tables */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Tables</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.2rem 0' }}>{summary.total}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Clubhouse & Patio</div>
        </div>

        {/* Available */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.78rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Available</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', margin: '0.2rem 0' }}>{summary.available}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ready for seating</div>
        </div>

        {/* Reserved */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #d97706', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.78rem', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Reserved</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>{summary.reserved}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Reserved parties</div>
        </div>

        {/* Occupied */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.78rem', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Occupied</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', margin: '0.2rem 0' }}>{summary.occupied}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Currently dining</div>
        </div>

        {/* Under Maintenance */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.78rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Under Maintenance</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', margin: '0.2rem 0' }}>{summary.maintenance}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Temporarily offline</div>
        </div>
      </div>

      {/* UPDATE 4: FILTER AND SEARCH BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1rem 1.25rem',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Filter buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.25rem' }}>
            <Filter size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Filter:
          </span>
          {[
            { key: 'ALL', label: `All (${summary.total})` },
            { key: 'AVAILABLE', label: `Available (${summary.available})` },
            { key: 'RESERVED', label: `Reserved (${summary.reserved})` },
            { key: 'OCCUPIED', label: `Occupied (${summary.occupied})` },
            { key: 'UNDER_MAINTENANCE', label: `Maintenance (${summary.maintenance})` }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className="btn"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: statusFilter === f.key ? 700 : 500,
                background: statusFilter === f.key ? 'var(--primary)' : 'var(--bg-main)',
                color: statusFilter === f.key ? 'white' : 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search table number or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* UPDATE 4: VISUAL TABLE LAYOUT GRID */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading café table layout...</div>
      ) : filteredTables.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
          No tables found matching your search and filter criteria.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredTables.map(t => {
            const isReserved = t.status === 'RESERVED';
            const isOccupied = t.status === 'OCCUPIED';
            const isMaint = t.status === 'UNDER_MAINTENANCE';

            let cardBorder = '1px solid var(--border-subtle)';
            let accentColor = 'var(--primary)';
            if (isReserved) {
              cardBorder = '1px solid rgba(217, 119, 6, 0.4)';
              accentColor = '#d97706';
            } else if (isOccupied) {
              cardBorder = '1px solid rgba(59, 130, 246, 0.4)';
              accentColor = '#3b82f6';
            } else if (isMaint) {
              cardBorder = '1px solid rgba(239, 68, 68, 0.4)';
              accentColor = '#ef4444';
            }

            return (
              <div
                key={t.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  border: cardBorder,
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>{t.table_number}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{t.table_name || 'Café Dining'}</div>
                    </div>
                    {getStatusBadge(t.status)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    <div style={{
                      padding: '4px 8px',
                      background: 'var(--bg-main)',
                      borderRadius: '4px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      🪑 {t.capacity} Seats
                    </div>
                    {t.notes && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.notes}
                      </span>
                    )}
                  </div>

                  {/* Reservation details if reserved */}
                  {isReserved && t.reserved_by && (
                    <div style={{
                      padding: '0.6rem 0.75rem',
                      background: 'rgba(217, 119, 6, 0.08)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      marginBottom: '1rem',
                      borderLeft: '3px solid #d97706'
                    }}>
                      <div style={{ fontWeight: 600, color: '#b45309' }}>Reserved: {t.reserved_by}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {t.reservation_time ? `Time: ${t.reservation_time}` : 'Scheduled'} • Party: {t.party_size || t.capacity}
                      </div>
                    </div>
                  )}
                </div>

                {/* UPDATE 5: STATUS CHANGE ACTION BUTTON */}
                {canManage ? (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => openStatusEditor(t)}
                      className="btn btn-outline"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        borderColor: 'var(--border-subtle)'
                      }}
                    >
                      <Edit3 size={13} /> Change Status
                    </button>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Floor status is read-only for members.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* UPDATE 5: STATUS CHANGE MODAL */}
      {editingTable && !showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>
              Manage {editingTable.table_number}
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Current Status: <strong>{editingTable.status}</strong> ({editingTable.capacity} Seats)
            </p>

            <form onSubmit={handleStatusChangeRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Target Operational Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                >
                  <option value="AVAILABLE">AVAILABLE (Open for Walk-In / Seating)</option>
                  <option value="OCCUPIED">OCCUPIED (Currently in use)</option>
                  <option value="RESERVED">RESERVED (Hold for guest)</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE (Offline for cleaning/repair)</option>
                </select>
              </div>

              {/* Conditional Reservation inputs */}
              {newStatus === 'RESERVED' && (
                <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706' }}>
                    Reservation Information
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Reserved For / Guest Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Mercer"
                      value={reservedBy}
                      onChange={(e) => setReservedBy(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                      required={newStatus === 'RESERVED'}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Reservation Time</label>
                      <input
                        type="text"
                        placeholder="07:30 PM"
                        value={reservationTime}
                        onChange={(e) => setReservationTime(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Party Size</label>
                      <input
                        type="number"
                        min="1"
                        max={editingTable.capacity}
                        value={partySize}
                        onChange={(e) => setPartySize(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Special Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Birthday table decor"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  Review Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE 5: CONFIRMATION MODAL */}
      {showConfirmModal && editingTable && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
              Confirm Table Status Change
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Are you sure you want to mark <strong>{editingTable.table_number}</strong> as{' '}
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{newStatus.replace('_', ' ')}</span>?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-outline"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleConfirmStatusChange}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                {isSubmitting ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
