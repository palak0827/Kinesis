import React, { useState, useEffect } from 'react';
import {
  getStaffList, createStaffMember, updateStaffMember, deleteStaffMember,
  getStaffShifts, updateShiftDutyStatus, getStaffLeaves, processLeaveRequest, logAudit
} from '../../services/clubPlatformService.js';
import {
  Briefcase, Users, Clock, Calendar, CheckCircle2, XCircle, Plus,
  RefreshCw, Search, Edit3, Trash2, X, AlertCircle
} from 'lucide-react';

export default function StaffManagerPortal({ navigate }) {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'shifts' | 'leave'
  const [staffList, setStaffList] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [kpis, setKpis] = useState({
    totalStaff: 0,
    activeStaff: 0,
    onDuty: 0,
    onLeave: 0,
    departments: 6,
    pendingLeave: 0
  });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Add / Edit Modal state
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Court Staff',
    department: 'Courts',
    duties: '',
    salary: 35000,
    shift: 'Morning (06:00 - 15:00)',
    employment_status: 'ACTIVE'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffData, shiftsData, leavesData] = await Promise.all([
        getStaffList(),
        getStaffShifts(),
        getStaffLeaves()
      ]);

      setStaffList(staffData || []);
      setShifts(shiftsData || []);
      setLeaves(leavesData || []);

      const active = (staffData || []).filter(s => s.employment_status === 'ACTIVE').length;
      const onDuty = (shiftsData || []).filter(s => s.status === 'ON DUTY').length;
      const onLv = (shiftsData || []).filter(s => s.status === 'ON LEAVE').length;
      const pending = (leavesData || []).filter(l => l.status === 'PENDING').length;
      const depts = new Set((staffData || []).map(s => s.department)).size;

      setKpis({
        totalStaff: staffData?.length || 0,
        activeStaff: active,
        onDuty: onDuty,
        onLeave: onLv,
        departments: depts || 6,
        pendingLeave: pending
      });
    } catch (e) {
      console.warn('Failed loading staff manager data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
      role: 'Court Staff',
      department: 'Courts',
      duties: '',
      salary: 35000,
      shift: 'Morning (06:00 - 15:00)',
      employment_status: 'ACTIVE'
    });
    setModalMode('add');
  };

  const openEditModal = (staff) => {
    setSelectedStaff(staff);
    setForm({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      department: staff.department,
      duties: staff.duties || '',
      salary: staff.salary || 35000,
      shift: staff.shift || 'Morning (06:00 - 15:00)',
      employment_status: staff.employment_status || 'ACTIVE'
    });
    setModalMode('edit');
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await createStaffMember(form);
        setFeedback({ type: 'success', text: `Added new staff member: ${form.name}` });
      } else if (modalMode === 'edit' && selectedStaff) {
        await updateStaffMember(selectedStaff.id, form);
        setFeedback({ type: 'success', text: `Updated ${form.name}'s records.` });
      }
      setModalMode(null);
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Operation failed.' });
    }
  };

  const handleToggleDuty = async (shiftId, currentStatus) => {
    const nextStatus = currentStatus === 'ON DUTY' ? 'OFF DUTY' : 'ON DUTY';
    try {
      await updateShiftDutyStatus(shiftId, nextStatus);
      setFeedback({ type: 'success', text: `Shift status changed to ${nextStatus}.` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed updating shift.' });
    }
  };

  const handleLeaveAction = async (leaveId, approved) => {
    try {
      await processLeaveRequest(leaveId, approved, 'Rajesh Sharma');
      setFeedback({ type: 'success', text: `Leave request ${approved ? 'approved' : 'rejected'}.` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed processing leave.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#b45309', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            <Briefcase size={16} /> Human Resources & Operations Portal
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-main)' }}>Staff Management & Shifts</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage club staff roster, department assignments, shift attendance, and leave workflows.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={openAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem' }}>
            <Plus size={16} /> Add Staff Member
          </button>
          <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.88rem',
          background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: feedback.type === 'error' ? '#ef4444' : '#10b981',
          border: `1px solid ${feedback.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Total Staff</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{kpis.totalStaff}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employees on Roster</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>On Duty Now</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{kpis.onDuty}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active in Club</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>On Leave</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>{kpis.onLeave}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved Absence</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Departments</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.25rem' }}>{kpis.departments}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operations Units</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #d97706' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Pending Leaves</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#d97706', marginTop: '0.25rem' }}>{kpis.pendingLeave}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting Approval</div>
        </div>
      </div>

      {/* Subtabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('staff')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'staff' ? 'var(--primary)' : 'transparent', color: activeTab === 'staff' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Staff Directory ({staffList.length})
        </button>
        <button 
          onClick={() => setActiveTab('shifts')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'shifts' ? 'var(--primary)' : 'transparent', color: activeTab === 'shifts' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Duty Shifts ({shifts.length})
        </button>
        <button 
          onClick={() => setActiveTab('leave')} 
          style={{ padding: '0.6rem 1.25rem', border: 'none', background: activeTab === 'leave' ? 'var(--primary)' : 'transparent', color: activeTab === 'leave' ? '#fff' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}
        >
          Leave Management ({leaves.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: STAFF DIRECTORY */}
      {/* ======================================================== */}
      {activeTab === 'staff' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem' }}>Club Employee Roster</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Employee Name</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Role & Title</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Department</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Contact</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Monthly Salary</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joined: {s.joining_date}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{s.role}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ background: 'var(--bg-main)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                        {s.department}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <div>{s.email}</div>
                      <div>{s.phone}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)' }}>
                      ₹{Number(s.salary).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: s.employment_status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: s.employment_status === 'ACTIVE' ? '#10b981' : '#ef4444'
                      }}>
                        {s.employment_status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => openEditModal(s)}
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: DUTY SHIFTS */}
      {/* ======================================================== */}
      {activeTab === 'shifts' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem' }}>Daily Duty Shifts Roster</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Staff Member</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Role</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Shift Hours</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Duty Toggle</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map(sh => (
                  <tr key={sh.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{sh.name}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{sh.role}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{sh.shift}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sh.start} – {sh.end}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: sh.status === 'ON DUTY' ? 'rgba(16,185,129,0.15)' : sh.status === 'ON LEAVE' ? 'rgba(245,158,11,0.15)' : 'rgba(148,163,184,0.15)',
                        color: sh.status === 'ON DUTY' ? '#10b981' : sh.status === 'ON LEAVE' ? '#f59e0b' : '#64748b'
                      }}>
                        {sh.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      {sh.status !== 'ON LEAVE' && (
                        <button 
                          onClick={() => handleToggleDuty(sh.id, sh.status)}
                          className={sh.status === 'ON DUTY' ? 'btn btn-secondary' : 'btn btn-primary'}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          {sh.status === 'ON DUTY' ? 'Mark Off Duty' : 'Mark On Duty'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: LEAVE MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'leave' && (
        <div className="card" style={{ padding: '1.75rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem' }}>Staff Leave Applications & Requests</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Staff Member</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Leave Type</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Dates</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Reason</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{l.staff_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.department}</div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{l.leave_type}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem' }}>
                      {l.start_date} to {l.end_date}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{l.reason}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: l.status === 'APPROVED' ? 'rgba(16,185,129,0.15)' : l.status === 'REJECTED' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: l.status === 'APPROVED' ? '#10b981' : l.status === 'REJECTED' ? '#ef4444' : '#f59e0b'
                      }}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      {l.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleLeaveAction(l.id, true)} className="btn btn-primary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', background: '#10b981' }}>
                            Approve
                          </button>
                          <button onClick={() => handleLeaveAction(l.id, false)} className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', color: '#ef4444' }}>
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved by {l.approved_by || 'HR'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {modalMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>{modalMode === 'add' ? 'Add New Employee' : `Edit ${form.name}`}</h3>
              <button onClick={() => setModalMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveStaff} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Email</label>
                  <input 
                    type="email" 
                    required
                    placeholder="email@kinesis.club"
                    value={form.email} 
                    onChange={e => setForm({ ...form, email: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Phone</label>
                  <input 
                    type="text" 
                    placeholder="+91 98200..."
                    value={form.phone} 
                    onChange={e => setForm({ ...form, phone: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Department</label>
                  <select 
                    value={form.department} 
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="Restaurant">Restaurant</option>
                    <option value="Bar">Bar</option>
                    <option value="Gear Shop">Gear Shop</option>
                    <option value="Courts">Courts</option>
                    <option value="Reception">Reception</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Operations">Operations</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Assigned Role</label>
                  <select 
                    value={form.role} 
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="Court Manager">Court Manager (COURT_MANAGER)</option>
                    <option value="Restaurant Manager">Restaurant Manager (RESTAURANT_MANAGER)</option>
                    <option value="Bar Manager">Bar Manager (BAR_MANAGER)</option>
                    <option value="Shop Manager">Shop Manager (SHOP_MANAGER)</option>
                    <option value="Staff Manager">Staff Manager (STAFF_MANAGER)</option>
                    <option value="Reception">Reception (RECEPTION)</option>
                    <option value="Kitchen Staff">Kitchen Staff</option>
                    <option value="Court Steward">Court Steward</option>
                    <option value="Security Guard">Security Guard</option>
                    <option value="Unassigned">Unassigned (No Active Role)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Monthly Salary (₹)</label>
                  <input 
                    type="number" 
                    value={form.salary} 
                    onChange={e => setForm({ ...form, salary: e.target.value })} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Employment Status</label>
                  <select 
                    value={form.employment_status} 
                    onChange={e => setForm({ ...form, employment_status: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="PROBATION">PROBATION</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Shift Hours</label>
                <input 
                  type="text" 
                  value={form.shift} 
                  onChange={e => setForm({ ...form, shift: e.target.value })} 
                  className="form-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModalMode(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
