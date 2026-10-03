import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  PlusCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  DollarSign,
  User,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import {
  getCourts,
  getBookings,
  createBooking,
  cancelBooking,
  calculateBookingPrice,
  checkMemberDailyLimit,
  checkCourtAvailability
} from '@backend/services/bookingService.js';
import { getMembers } from '@backend/services/memberService.js';

export default function Bookings() {
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date selection (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sportFilter, setSportFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Booking Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    courtId: '',
    memberId: '',
    bookingDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00'
  });

  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [memberLimitInfo, setMemberLimitInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // 30-min start time slots from 07:00 to 22:00
  const timeSlots = [];
  for (let hour = 7; hour <= 21; hour++) {
    const hStr = String(hour).padStart(2, '0');
    timeSlots.push(`${hStr}:00`);
    timeSlots.push(`${hStr}:30`);
  }

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [courtsData, bookingsData, membersData] = await Promise.all([
        getCourts(),
        getBookings({ date: selectedDate }),
        getMembers()
      ]);
      setCourts(courtsData);
      setBookings(bookingsData);
      setMembers(membersData);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate price and limits when court or member changes in modal
  useEffect(() => {
    const checkPricingAndLimits = async () => {
      setValidationError('');
      if (!modalForm.courtId || !modalForm.memberId) {
        setPriceBreakdown(null);
        setMemberLimitInfo(null);
        return;
      }

      try {
        const pricing = await calculateBookingPrice(modalForm.courtId, modalForm.memberId);
        setPriceBreakdown(pricing);

        const limitCheck = await checkMemberDailyLimit(modalForm.memberId, modalForm.bookingDate);
        setMemberLimitInfo(limitCheck);

        if (!limitCheck.allowed) {
          setValidationError(limitCheck.reason);
        }
      } catch (e) {
        console.warn(e);
      }
    };

    if (isModalOpen) {
      checkPricingAndLimits();
    }
  }, [modalForm.courtId, modalForm.memberId, modalForm.bookingDate, isModalOpen]);

  const handleOpenBookingModal = (courtId = null, startTime = '09:00') => {
    setValidationError('');
    const defaultCourt = courtId || courts.find((c) => c.status === 'available')?.id || courts[0]?.id;
    const defaultMember = members.find((m) => m.status === 'active')?.id || members[0]?.id;

    // Calculate end time = +1 hr
    const [h, m] = startTime.split(':').map(Number);
    const endH = String(h + 1).padStart(2, '0');
    const endM = String(m).padStart(2, '0');
    const endTime = `${endH}:${endM}`;

    setModalForm({
      courtId: defaultCourt,
      memberId: defaultMember,
      bookingDate: selectedDate,
      startTime,
      endTime
    });
    setIsModalOpen(true);
  };

  const handleStartTimeChange = (newStartTime) => {
    const [h, m] = newStartTime.split(':').map(Number);
    const endH = String(h + 1).padStart(2, '0');
    const endM = String(m).padStart(2, '0');
    const newEndTime = `${endH}:${endM}`;

    setModalForm({
      ...modalForm,
      startTime: newStartTime,
      endTime: newEndTime
    });
  };

  const handleCreateBookingSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setSubmitting(true);

    try {
      await createBooking({
        memberId: modalForm.memberId,
        courtId: modalForm.courtId,
        bookingDate: modalForm.bookingDate,
        startTime: modalForm.startTime,
        endTime: modalForm.endTime
      });

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setValidationError(err.message || 'Failed to complete booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId, courtName, timeSlot) => {
    if (window.confirm(`Cancel reservation for ${courtName} at ${timeSlot}? This will immediately reopen the slot for other members.`)) {
      try {
        await cancelBooking(bookingId);
        await loadData();
      } catch (err) {
        alert(err.message || 'Error cancelling booking');
      }
    }
  };

  const changeDateBy = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Courts filtered by sport
  const filteredCourts = courts.filter((c) => {
    if (sportFilter === 'all') return true;
    return c.sport.toLowerCase() === sportFilter.toLowerCase();
  });

  // Check if a court has a confirmed booking for a slot
  const getBookingForSlot = (courtId, timeSlot) => {
    // timeSlot is "HH:mm"
    // Find active booking that covers this start time
    return bookings.find((b) => {
      if (b.status === 'cancelled') return false;
      if (Number(b.court_id) !== Number(courtId)) return false;

      const bStart = b.start_time?.slice(0, 5);
      const bEnd = b.end_time?.slice(0, 5);
      return timeSlot >= bStart && timeSlot < bEnd;
    });
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <CalendarDays size={26} color="#10b981" />
            <span>Court Booking & Availability</span>
          </h1>
          <p className="page-subtitle">
            Collision-free court schedule, membership discounts, and 1-hour session management.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => handleOpenBookingModal()}>
          <PlusCircle size={16} />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Control Bar: Date Navigation & Sport Filter */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {/* Date Selector with Next / Prev */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => changeDateBy(-1)}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>

            <input
              type="date"
              className="form-input"
              style={{ width: 'auto', padding: '7px 12px', fontSize: '13.5px', fontWeight: 600 }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => changeDateBy(1)}
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              style={{ fontSize: '12px' }}
            >
              Today
            </button>
          </div>

          {/* Sport Category Filter & View Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-dim)', fontWeight: 600 }}>Sport:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '7px 12px', fontSize: '13px' }}
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
              >
                <option value="all">All Sports ({courts.length})</option>
                <option value="tennis">Tennis</option>
                <option value="squash">Squash</option>
                <option value="badminton">Badminton</option>
                <option value="padel">Padel</option>
              </select>
            </div>

            <div
              style={{
                display: 'flex',
                backgroundColor: '#090e1c',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                padding: '2px'
              }}
            >
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  background: viewMode === 'grid' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: viewMode === 'grid' ? '#10b981' : 'var(--text-muted)',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Timeline Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  background: viewMode === 'table' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: viewMode === 'table' ? '#10b981' : 'var(--text-muted)',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                List View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE AVAILABILITY TIMELINE GRID */}
      {viewMode === 'grid' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#10b981" />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>
                Court Schedule for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: 'rgba(16, 185, 129, 0.4)' }} />
                <span>Reserved Slot</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)' }} />
                <span>Available</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: 'rgba(245, 158, 11, 0.2)' }} />
                <span>Maintenance</span>
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '680px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, backgroundColor: '#090e1c', zIndex: 10 }}>
                  <th
                    style={{
                      padding: '12px 14px',
                      fontSize: '11.5px',
                      color: 'var(--text-dim)',
                      fontWeight: 700,
                      width: '90px',
                      borderBottom: '1px solid var(--border-subtle)',
                      borderRight: '1px solid var(--border-subtle)'
                    }}
                  >
                    TIME
                  </th>
                  {filteredCourts.map((court) => (
                    <th
                      key={court.id}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--border-subtle)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                        minWidth: '150px'
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>
                        {court.name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        <span>{court.sport}</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>₹{court.hourly_rate}/hr</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    {/* Time Label */}
                    <td
                      style={{
                        padding: '10px 14px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        backgroundColor: '#070c18',
                        borderRight: '1px solid var(--border-subtle)',
                        fontWeight: slot.endsWith(':00') ? 700 : 400
                      }}
                    >
                      {slot}
                    </td>

                    {/* Court Slots */}
                    {filteredCourts.map((court) => {
                      const isMaintenance = court.status === 'maintenance';
                      const booking = getBookingForSlot(court.id, slot);

                      if (isMaintenance) {
                        return (
                          <td
                            key={court.id}
                            style={{
                              padding: '8px 10px',
                              backgroundColor: 'rgba(245, 158, 11, 0.03)',
                              borderRight: '1px solid rgba(255, 255, 255, 0.03)',
                              color: 'var(--status-warning)',
                              fontSize: '11px',
                              textAlign: 'center'
                            }}
                          >
                            <span style={{ opacity: 0.6 }}>Under Maintenance</span>
                          </td>
                        );
                      }

                      if (booking) {
                        const isPrimarySlot = booking.start_time?.slice(0, 5) === slot;
                        return (
                          <td
                            key={court.id}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: 'rgba(16, 185, 129, 0.08)',
                              borderRight: '1px solid rgba(255, 255, 255, 0.03)',
                              borderLeft: '2px solid #10b981'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '12px', color: '#fff' }}>
                                  {booking.members?.name || 'Reserved'}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span className={`badge badge-${booking.members?.membership_plans?.name?.toLowerCase() || 'gold'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                                    {booking.members?.membership_plans?.name || 'Gold'}
                                  </span>
                                  <span>• ₹{Number(booking.price).toFixed(2)}</span>
                                </div>
                              </div>

                              {isPrimarySlot && (
                                <button
                                  onClick={() => handleCancelBooking(booking.id, court.name, slot)}
                                  className="btn btn-outline-danger btn-sm"
                                  style={{ padding: '2px 6px', fontSize: '10px' }}
                                  title="Cancel this booking"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // Open Slot
                      return (
                        <td
                          key={court.id}
                          style={{
                            padding: '4px 8px',
                            borderRight: '1px solid rgba(255, 255, 255, 0.03)'
                          }}
                        >
                          <button
                            onClick={() => handleOpenBookingModal(court.id, slot)}
                            style={{
                              width: '100%',
                              padding: '6px',
                              background: 'transparent',
                              border: '1px dashed rgba(255, 255, 255, 0.06)',
                              borderRadius: '6px',
                              color: 'var(--text-dim)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#10b981';
                              e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
                              e.currentTarget.style.color = '#10b981';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = 'var(--text-dim)';
                            }}
                          >
                            + Book Slot
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: TABLE LIST VIEW */}
      {viewMode === 'table' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Court & Sport</th>
                  <th>Date & Time</th>
                  <th>Member</th>
                  <th>Plan Tier</th>
                  <th>Base Rate</th>
                  <th>Discount</th>
                  <th>Final Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                      No court reservations found for {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => {
                    const isCancelled = b.status === 'cancelled';
                    const courtRate = Number(b.courts?.hourly_rate || 0);
                    const discount = Math.max(0, courtRate - Number(b.price));

                    return (
                      <tr key={b.id} style={{ opacity: isCancelled ? 0.6 : 1 }}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          #{b.id}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#fff' }}>
                            {b.courts?.name || `Court #${b.court_id}`}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {b.courts?.sport}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{b.booking_date}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                            <Clock size={12} />
                            <span>
                              {b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{b.members?.name || `Member #${b.member_id}`}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>{b.members?.email}</div>
                        </td>
                        <td>
                          <span className={`badge badge-${b.members?.membership_plans?.name?.toLowerCase() || 'gold'}`}>
                            {b.members?.membership_plans?.name || 'Standard'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          ₹{courtRate.toFixed(2)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>
                          -₹{discount.toFixed(2)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10b981' }}>
                          ₹{Number(b.price).toFixed(2)}
                        </td>
                        <td>
                          <span className={`badge badge-${isCancelled ? 'expired' : 'active'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {!isCancelled && (
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleCancelBooking(b.id, b.courts?.name, b.start_time?.slice(0, 5))}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Court Booking */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Reserve a Court Slot"
      >
        <form onSubmit={handleCreateBookingSubmit}>
          {validationError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fb7185',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={18} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Court Selection */}
          <div className="form-group">
            <label className="form-label">Select Facility / Court *</label>
            <select
              className="form-select"
              required
              value={modalForm.courtId}
              onChange={(e) => setModalForm({ ...modalForm, courtId: Number(e.target.value) })}
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id} disabled={c.status === 'maintenance'}>
                  {c.name} ({c.sport}) - ₹{c.hourly_rate}/hr {c.status === 'maintenance' ? '[MAINTENANCE]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Member Selection */}
          <div className="form-group">
            <label className="form-label">Select Club Member *</label>
            <select
              className="form-select"
              required
              value={modalForm.memberId}
              onChange={(e) => setModalForm({ ...modalForm, memberId: Number(e.target.value) })}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.membership_plans?.name || 'Standard'} Plan) - Status: {m.status}
                </option>
              ))}
            </select>
          </div>

          {/* Booking Date & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Reservation Date *</label>
              <input
                type="date"
                required
                className="form-input"
                value={modalForm.bookingDate}
                onChange={(e) => setModalForm({ ...modalForm, bookingDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Session Start (1 Hour) *</label>
              <select
                className="form-select"
                value={modalForm.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot} (ends {String(Number(slot.split(':')[0]) + 1).padStart(2, '0')}:{slot.split(':')[1]})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Member Daily Quota Feedback */}
          {memberLimitInfo && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: memberLimitInfo.allowed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.1)',
                border: `1px solid ${memberLimitInfo.allowed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.3)'}`,
                fontSize: '12.5px',
                color: '#cbd5e1',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Daily Booking Quota:</span>
                <span style={{ fontWeight: 700, color: memberLimitInfo.allowed ? '#10b981' : '#fb7185' }}>
                  {memberLimitInfo.count} / {memberLimitInfo.limit} Slots Used Today
                </span>
              </div>
            </div>
          )}

          {/* Real-time Centralized Pricing Breakdown */}
          {priceBreakdown && (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#080d1a',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '20px'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Pricing Calculation Engine
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>Court Base Rate (1 hr):</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>₹{priceBreakdown.baseRate.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#06b6d4', marginBottom: '8px' }}>
                <span>{priceBreakdown.planName} Plan Discount ({priceBreakdown.discountPercent}%):</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>-₹{priceBreakdown.discountAmount.toFixed(2)}</span>
              </div>

              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                <span>Net Total:</span>
                <span style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                  ₹{priceBreakdown.finalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || (memberLimitInfo && !memberLimitInfo.allowed)}
            >
              {submitting ? 'Confirming...' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
