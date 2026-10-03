import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Award
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  getMembershipPlans
} from '@backend/services/memberService.js';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    plan_id: 1,
    durationMonths: 12,
    status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, plansData] = await Promise.all([
        getMembers(),
        getMembershipPlans()
      ]);
      setMembers(membersData);
      setPlans(plansData);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setErrorMsg('');
    setFormData({
      name: '',
      email: '',
      phone: '',
      plan_id: plans[0]?.id || 1,
      durationMonths: 12,
      status: 'active'
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (member) => {
    setErrorMsg('');
    setSelectedMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      plan_id: member.plan_id || 1,
      status: member.status || 'active',
      expiry_date: member.expiry_date
    });
    setIsEditModalOpen(true);
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formData.name.trim() || !formData.email.trim()) {
      setErrorMsg('Name and email are required.');
      return;
    }

    setSubmitting(true);
    try {
      const startDate = new Date().toISOString().split('T')[0];
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + Number(formData.durationMonths || 12));
      const expiryDate = expiry.toISOString().split('T')[0];

      await createMember({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        plan_id: formData.plan_id,
        start_date: startDate,
        expiry_date: expiryDate,
        status: formData.status
      });

      setIsAddModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    setErrorMsg('');

    setSubmitting(true);
    try {
      await updateMember(selectedMember.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        plan_id: formData.plan_id,
        status: formData.status,
        expiry_date: formData.expiry_date
      });

      setIsEditModalOpen(false);
      setSelectedMember(null);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove member "${name}"? This will cancel any upcoming bookings.`)) {
      try {
        await deleteMember(id);
        await loadData();
      } catch (err) {
        alert(err.message || 'Error deleting member');
      }
    }
  };

  const handleRenewMember = async (member) => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const newExpiry = nextYear.toISOString().split('T')[0];

    try {
      await updateMember(member.id, {
        status: 'active',
        expiry_date: newExpiry
      });
      await loadData();
    } catch (err) {
      alert(err.message || 'Error renewing membership');
    }
  };

  // Filtered members with Phase 26 criteria
  const filteredMembers = members.filter((m) => {
    const isWalkIn = m.user_type === 'WALK_IN' || (!m.plan_id && !m.membership_plans);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = m.expiry_date ? new Date(m.expiry_date) : null;
    if (expDate) expDate.setHours(0, 0, 0, 0);
    const daysRemaining = expDate ? Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const matchesSearch =
      searchTerm === '' ||
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = !isWalkIn && m.status === 'active' && (daysRemaining === null || daysRemaining >= 0);
    } else if (statusFilter === 'expiring') {
      matchesStatus = !isWalkIn && m.status === 'active' && daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;
    } else if (statusFilter === 'expired') {
      matchesStatus = !isWalkIn && (m.status === 'expired' || (daysRemaining !== null && daysRemaining < 0));
    } else if (statusFilter === 'walkin') {
      matchesStatus = isWalkIn;
    } else if (statusFilter !== 'all') {
      matchesStatus = m.status === statusFilter;
    }

    const matchesPlan =
      planFilter === 'all' ||
      m.membership_plans?.name?.toLowerCase() === planFilter.toLowerCase() ||
      String(m.plan_id) === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const activePlanObj = plans.find((p) => p.id === Number(formData.plan_id));

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Users size={26} color="#10b981" />
            <span>Membership Management</span>
          </h1>
          <p className="page-subtitle">
            Manage club members, membership tiers (Gold, Silver, Junior), discounts and quotas.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <UserPlus size={16} />
          <span>Register New Member</span>
        </button>
      </div>

      {/* Plan Benefits Summary Cards - PHASE 2: DYNAMIC BENEFIT VALUES */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {plans.map((p) => {
          const isGold = p.name.toLowerCase() === 'gold';
          const isSilver = p.name.toLowerCase() === 'silver';
          const borderColor = isGold ? '#f59e0b' : isSilver ? '#94a3b8' : '#06b6d4';

          return (
            <div
              key={p.id}
              className="card"
              style={{
                padding: '20px',
                borderLeft: `5px solid ${borderColor}`,
                background: 'var(--bg-surface)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} color={borderColor} />
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {p.name}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--primary)', fontSize: '1.3rem' }}>
                  ₹{Number(p.monthly_price).toLocaleString('en-IN')}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}> / month</span>
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Court Discount</span>
                  <strong style={{ color: 'var(--text-main)' }}>{p.court_discount}% OFF</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gear Shop Discount</span>
                  <strong style={{ color: 'var(--text-main)' }}>{p.shop_discount}% OFF</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Café & Bar Discount</span>
                  <strong style={{ color: 'var(--text-main)' }}>{p.bar_discount}% OFF</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Daily Booking Limit</span>
                  <strong style={{ color: 'var(--text-main)' }}>{p.daily_booking_limit} / day</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
            <div className="input-with-icon" style={{ flex: 1 }}>
              <Search size={16} />
              <input
                type="text"
                className="form-input"
                placeholder="Search member by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Status Filter - Phase 26 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-dim)', fontWeight: 600 }}>Filter:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '8px 12px', fontSize: '13px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Accounts</option>
                <option value="active">Active Members</option>
                <option value="expiring">Expiring Soon (7d)</option>
                <option value="expired">Expired Members</option>
                <option value="walkin">Walk-In Users</option>
              </select>
            </div>

            {/* Plan Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-dim)', fontWeight: 600 }}>Plan:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '8px 12px', fontSize: '13px' }}
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                <option value="all">All Plans</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.name.toLowerCase()}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Club ID</th>
                <th>Full Name</th>
                <th>Contact Info</th>
                <th>Account Type</th>
                <th>Membership Plan</th>
                <th>Membership Status</th>
                <th>Start Date</th>
                <th>Expiry Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                    No member accounts found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const plan = m.membership_plans;
                  const isWalkIn = m.user_type === 'WALK_IN' || (!m.plan_id && !m.membership_plans);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const expDate = m.expiry_date ? new Date(m.expiry_date) : null;
                  if (expDate) expDate.setHours(0, 0, 0, 0);
                  const daysRemaining = expDate ? Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  const isExpired = !isWalkIn && (m.status === 'expired' || (daysRemaining !== null && daysRemaining < 0));
                  const isExpiringSoon = !isWalkIn && !isExpired && daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;

                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '13px' }}>
                        #{m.id}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                        {m.club_id || 'N/A'}
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: isWalkIn ? 'rgba(100, 116, 139, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '12px',
                              color: isWalkIn ? 'var(--text-muted)' : 'var(--primary)',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            {m.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '14px' }}>
                            {m.name}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          <div>{m.email}</div>
                          {m.phone && <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{m.phone}</div>}
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isWalkIn ? 'rgba(100, 116, 139, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isWalkIn ? 'var(--text-muted)' : 'var(--primary)',
                            textTransform: 'uppercase'
                          }}
                        >
                          {isWalkIn ? 'WALK-IN' : 'MEMBER'}
                        </span>
                      </td>

                      <td>
                        {isWalkIn ? (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No Membership</span>
                        ) : (
                          <span className={`badge badge-${plan?.name?.toLowerCase() || 'gold'}`}>
                            {plan?.name || 'Standard'}
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isWalkIn
                              ? 'rgba(100, 116, 139, 0.1)'
                              : isExpired
                              ? 'rgba(239, 68, 68, 0.15)'
                              : isExpiringSoon
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(16, 185, 129, 0.15)',
                            color: isWalkIn
                              ? 'var(--text-muted)'
                              : isExpired
                              ? '#ef4444'
                              : isExpiringSoon
                              ? '#f59e0b'
                              : '#10b981',
                            textTransform: 'uppercase'
                          }}
                        >
                          {isWalkIn
                            ? 'NO MEMBERSHIP'
                            : isExpired
                            ? 'EXPIRED'
                            : isExpiringSoon
                            ? `EXPIRING (${daysRemaining}d)`
                            : 'ACTIVE'}
                        </span>
                      </td>

                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {m.start_date || '—'}
                      </td>

                      <td style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                        {isWalkIn ? (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : (
                          <span style={{ color: isExpired ? '#f43f5e' : isExpiringSoon ? '#f59e0b' : 'inherit' }}>
                            {m.expiry_date}
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          {isExpired && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRenewMember(m)}
                              title="Renew 1 Year"
                              style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                            >
                              <RefreshCw size={13} />
                              <span>Renew</span>
                            </button>
                          )}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditModal(m)}
                            title="Edit Member"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteMember(m.id, m.name)}
                            title="Remove Member"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register New Member */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Club Member"
      >
        <form onSubmit={handleCreateMember}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                color: '#fb7185',
                fontSize: '13px',
                marginBottom: '16px'
              }}
            >
              {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Jordan Hayes"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. jordan.hayes@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="e.g. +1 (555) 019-2834"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Membership Tier *</label>
            <select
              className="form-select"
              value={formData.plan_id}
              onChange={(e) => setFormData({ ...formData, plan_id: Number(e.target.value) })}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} Tier (₹{p.monthly_price}/month) - {p.court_discount}% court discount
                </option>
              ))}
            </select>
          </div>

          {activePlanObj && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontSize: '12.5px',
                color: '#cbd5e1',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
                {activePlanObj.name} Privileges:
              </div>
              <div>• {activePlanObj.court_discount}% discount on all court bookings</div>
              <div>• {activePlanObj.shop_discount}% discount on Gear Shop equipment & apparel</div>
              <div>• Max {activePlanObj.daily_booking_limit} court reservations per day</div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Initial Subscription Period</label>
            <select
              className="form-select"
              value={formData.durationMonths}
              onChange={(e) => setFormData({ ...formData, durationMonths: Number(e.target.value) })}
            >
              <option value={1}>1 Month</option>
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>1 Year (Annual)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Member */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Member Information"
      >
        <form onSubmit={handleUpdateMember}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                color: '#fb7185',
                fontSize: '13px',
                marginBottom: '16px'
              }}
            >
              {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              required
              className="form-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Plan Tier</label>
            <select
              className="form-select"
              value={formData.plan_id}
              onChange={(e) => setFormData({ ...formData, plan_id: Number(e.target.value) })}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₹{p.monthly_price}/mo)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Membership Status</label>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Expiry Date</label>
            <input
              type="date"
              className="form-input"
              value={formData.expiry_date || ''}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
