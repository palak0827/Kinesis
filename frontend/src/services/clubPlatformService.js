import { supabase, shouldUseSupabase } from '../../../backend/services/supabaseClient.js';
import { createNotification } from './notificationService.js';

// Local storage fallback keys
const KEYS = {
  STAFF: 'kinesis_staff',
  SHIFTS: 'kinesis_staff_shifts',
  LEAVES: 'kinesis_staff_leaves',
  OFFERS: 'kinesis_offers',
  AUDIT: 'kinesis_audit_logs',
  PAYMENTS: 'kinesis_payments'
};

const DEFAULT_STAFF = [
  {
    id: 1,
    name: 'Devendra Joshi',
    email: 'restaurant@kinesis.club',
    phone: '+91 98201 12345',
    role: 'Restaurant Manager',
    department: 'Restaurant',
    duties: 'Floor seating, fine dining management, kitchen coordination',
    salary: 55000,
    joining_date: '2023-01-15',
    shift: 'Afternoon (14:00 - 22:00)',
    employment_status: 'ACTIVE'
  },
  {
    id: 2,
    name: 'Arun Nair',
    email: 'bar@kinesis.club',
    phone: '+91 98202 23456',
    role: 'Bar Manager',
    department: 'Bar',
    duties: 'Beverage curation, mocktails, inventory replenishment, cellar stock',
    salary: 48000,
    joining_date: '2023-03-01',
    shift: 'Evening (16:00 - 23:30)',
    employment_status: 'ACTIVE'
  },
  {
    id: 3,
    name: 'Simran Kaur',
    email: 'shop@kinesis.club',
    phone: '+91 98203 34567',
    role: 'Shop Manager',
    department: 'Gear Shop',
    duties: 'Sports equipment inventory, racket restringing, sports apparel',
    salary: 42000,
    joining_date: '2023-05-10',
    shift: 'Morning (09:00 - 18:00)',
    employment_status: 'ACTIVE'
  },
  {
    id: 4,
    name: 'Vikramaditya Rao',
    email: 'court@kinesis.club',
    phone: '+91 98204 45678',
    role: 'Court Manager',
    department: 'Courts',
    duties: 'Court scheduling, collision check, ticket verification, turf maintenance',
    salary: 45000,
    joining_date: '2022-11-20',
    shift: 'Morning (06:00 - 15:00)',
    employment_status: 'ACTIVE'
  },
  {
    id: 5,
    name: 'Priya Mehra',
    email: 'reception@kinesis.club',
    phone: '+91 98205 56789',
    role: 'Reception Manager',
    department: 'Reception',
    duties: 'Front desk hospitality, walk-in inquiries, offline memberships, billing',
    salary: 38000,
    joining_date: '2023-08-01',
    shift: 'Day (08:00 - 17:00)',
    employment_status: 'ACTIVE'
  },
  {
    id: 6,
    name: 'Rajesh Sharma',
    email: 'staff@kinesis.club',
    phone: '+91 98206 67890',
    role: 'Staff HR Manager',
    department: 'Operations',
    duties: 'Staff shift allocation, leave management, HR operations, payroll review',
    salary: 60000,
    joining_date: '2022-06-01',
    shift: 'General (09:30 - 18:30)',
    employment_status: 'ACTIVE'
  },
  {
    id: 7,
    name: 'Karan Patel',
    email: 'chef.karan@kinesis.club',
    phone: '+91 98207 78901',
    role: 'Executive Chef',
    department: 'Kitchen',
    duties: 'Artisan panini, protein bowls, kitchen hygiene, fast prep line',
    salary: 52000,
    joining_date: '2023-04-12',
    shift: 'Morning (07:00 - 16:00)',
    employment_status: 'ACTIVE'
  },
  {
    id: 8,
    name: 'Mahesh Thapa',
    email: 'security.lead@kinesis.club',
    phone: '+91 98208 89012',
    role: 'Security Lead',
    department: 'Security',
    duties: 'Club perimeter access control, parking coordination, safety checks',
    salary: 28000,
    joining_date: '2022-01-10',
    shift: 'Night (22:00 - 06:00)',
    employment_status: 'ACTIVE'
  }
];

const DEFAULT_OFFERS = [
  {
    id: 1,
    name: 'Diwali Grand Fest Offer',
    description: 'Special festival discount across all sports courts & merchandise for celebratory play',
    discount_percent: 15,
    applicable_to: 'All',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
    is_active: true
  },
  {
    id: 2,
    name: 'Summer Membership Drive',
    description: 'Flat 20% savings on new Gold and Silver annual memberships',
    discount_percent: 20,
    applicable_to: 'Membership',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    is_active: true
  },
  {
    id: 3,
    name: 'Morning Smash Court Pass',
    description: '10% discount on all morning tennis & badminton slots booked before 10 AM',
    discount_percent: 10,
    applicable_to: 'Courts',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    is_active: true
  },
  {
    id: 4,
    name: 'Café Happy Hour',
    description: '15% off mocktails and artisan beverages after 5 PM',
    discount_percent: 15,
    applicable_to: 'Bar',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    is_active: true
  }
];

const DEFAULT_AUDIT = [
  {
    id: 1,
    user_name: 'Club Administrator',
    role: 'ADMIN',
    action: 'System Initialized',
    entity: 'Platform',
    entity_id: 'SYS-01',
    details: 'Unified Kinesis Multi-Portal Architecture launched.',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    user_name: 'Devendra Joshi',
    role: 'RESTAURANT_MANAGER',
    action: 'Floor Table Audit',
    entity: 'Tables',
    entity_id: 'Table 05',
    details: 'Reserved VIP booth for Alex Mercer anniversary dining.',
    created_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 3,
    user_name: 'Vikramaditya Rao',
    role: 'COURT_MANAGER',
    action: 'Verified Ticket',
    entity: 'Booking',
    entity_id: 'KIN-CT-0001',
    details: 'Customer checked in and assigned to Court 1 (Tennis).',
    created_at: new Date(Date.now() - 900000).toISOString()
  }
];

function getLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  } catch {
    return fallback;
  }
}

function setLocal(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// ==========================================
// 1. AUDIT LOGGING
// ==========================================
export async function logAudit({ userName, role, action, entity, entityId = '', details = '' }) {
  const record = {
    user_name: userName || 'Staff User',
    role: role || 'STAFF',
    action,
    entity,
    entity_id: String(entityId),
    details,
    created_at: new Date().toISOString()
  };

  if (shouldUseSupabase()) {
    try {
      await supabase.from('audit_logs').insert([record]);
    } catch (e) {
      console.warn('Supabase audit log insert fallback:', e);
    }
  }

  const logs = getLocal(KEYS.AUDIT, DEFAULT_AUDIT);
  record.id = logs.length > 0 ? Math.max(...logs.map(l => l.id || 0)) + 1 : 1;
  logs.unshift(record);
  setLocal(KEYS.AUDIT, logs.slice(0, 100)); // keep last 100
  return record;
}

export async function getAuditLogs(limit = 50) {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  return getLocal(KEYS.AUDIT, DEFAULT_AUDIT).slice(0, limit);
}

// ==========================================
// 2. STAFF & HR MANAGEMENT
// ==========================================
export async function getStaffList() {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  return getLocal(KEYS.STAFF, DEFAULT_STAFF);
}

export async function createStaffMember(staffData) {
  const cleanName = (staffData.name || '').trim();
  if (!cleanName) throw new Error('Staff name is required.');
  if (/\d/.test(cleanName)) throw new Error('Staff name cannot contain numbers.');
  if (!staffData.email || !staffData.email.trim()) throw new Error('Staff email is required.');

  const normalizedEmail = staffData.email.trim().toLowerCase();
  const existingList = await getStaffList();
  const duplicate = existingList.find(s => s.email && s.email.toLowerCase() === normalizedEmail);
  if (duplicate) {
    throw new Error('A staff member with this email already exists.');
  }

  const salaryNum = Number(staffData.salary);
  if (isNaN(salaryNum) || salaryNum <= 0) {
    throw new Error('Salary must be a positive number greater than zero.');
  }

  if (!staffData.role || !staffData.role.trim()) {
    throw new Error('Staff role assignment is required.');
  }

  const targetRole = String(staffData.role || '').toUpperCase();
  if (targetRole === 'ADMIN' || targetRole === 'ADMINISTRATOR' || targetRole === 'ADMIN (EXECUTIVE)') {
    throw new Error('Unauthorized privilege escalation: Staff Manager cannot create or assign the ADMIN role.');
  }

  if (!staffData.department || !staffData.department.trim()) {
    throw new Error('Staff department is required.');
  }

  const newStaff = {
    ...staffData,
    name: cleanName,
    email: normalizedEmail,
    salary: salaryNum,
    created_at: new Date().toISOString()
  };

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .insert([newStaff])
        .select()
        .single();
      if (!error && data) {
        logAudit({ userName: 'Staff Manager', role: 'STAFF_MANAGER', action: 'Created Staff Member', entity: 'Staff', entityId: data.id, details: `Added ${data.name} (${data.role})` });
        dispatchStaffCreatedNotifications(data);
        return data;
      }
    } catch (e) {
      if (e.message && e.message.includes('already exists')) throw e;
    }
  }

  const list = getLocal(KEYS.STAFF, DEFAULT_STAFF);
  const id = list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1;
  const created = { id, ...newStaff };
  list.push(created);
  setLocal(KEYS.STAFF, list);

  logAudit({ userName: 'Staff Manager', role: 'STAFF_MANAGER', action: 'Created Staff Member', entity: 'Staff', entityId: id, details: `Added ${created.name} (${created.role})` });
  dispatchStaffCreatedNotifications(created);
  return created;
}

export async function updateStaffMember(id, updates) {
  if (updates.salary !== undefined) {
    const salaryNum = Number(updates.salary);
    if (isNaN(salaryNum) || salaryNum <= 0) {
      throw new Error('Salary must be a positive number greater than zero.');
    }
    updates.salary = salaryNum;
  }

  if (updates.email) {
    const normalizedEmail = updates.email.trim().toLowerCase();
    const existingList = await getStaffList();
    const duplicate = existingList.find(s => s.id !== Number(id) && s.email && s.email.toLowerCase() === normalizedEmail);
    if (duplicate) {
      throw new Error('Another staff member with this email already exists.');
    }
    updates.email = normalizedEmail;
  }

  if (updates.name) {
    updates.name = updates.name.trim();
    if (/\d/.test(updates.name)) throw new Error('Staff name cannot contain numbers.');
  }

  if (updates.role) {
    const targetRole = String(updates.role).toUpperCase();
    if (targetRole === 'ADMIN' || targetRole === 'ADMINISTRATOR' || targetRole === 'ADMIN (EXECUTIVE)') {
      throw new Error('Unauthorized privilege escalation: Staff Manager cannot promote to the ADMIN role.');
    }
  }

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        logAudit({ userName: 'Staff Manager', role: 'STAFF_MANAGER', action: 'Updated Staff Member', entity: 'Staff', entityId: id, details: `Updated ${data.name}` });
        dispatchStaffUpdatedNotifications(id, data, updates);
        return data;
      }
    } catch (e) {
      if (e.message && e.message.includes('already exists')) throw e;
    }
  }

  const list = getLocal(KEYS.STAFF, DEFAULT_STAFF);
  const idx = list.findIndex(s => s.id === Number(id));
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    setLocal(KEYS.STAFF, list);
    logAudit({ userName: 'Staff Manager', role: 'STAFF_MANAGER', action: 'Updated Staff Member', entity: 'Staff', entityId: id, details: `Updated ${list[idx].name}` });
    dispatchStaffUpdatedNotifications(id, list[idx], updates);
    return list[idx];
  }
  throw new Error('Staff member not found.');
}

async function dispatchStaffCreatedNotifications(staff) {
  try {
    await createNotification({
      recipientType: 'STAFF',
      recipientId: staff.id,
      role: 'STAFF',
      title: 'Role Assigned',
      message: `Your ${staff.role} access is now active.`,
      type: 'STAFF'
    });
    await createNotification({
      recipientType: 'ROLE',
      role: 'ADMIN',
      title: 'New Staff Member Added',
      message: `${staff.name} was added as ${staff.role} in ${staff.department}.`,
      type: 'STAFF'
    });
    await createNotification({
      recipientType: 'ROLE',
      role: 'STAFF_MANAGER',
      title: 'New Staff Member Added',
      message: `${staff.name} was added as ${staff.role} in ${staff.department}.`,
      type: 'STAFF'
    });
  } catch (e) {
    console.warn('Non-blocking staff notification error:', e);
  }
}

async function dispatchStaffUpdatedNotifications(id, staff, updates) {
  try {
    if (updates.role) {
      await createNotification({
        recipientType: 'STAFF',
        recipientId: id,
        title: 'Your Staff Role Has Been Updated',
        message: `Your role has been updated to ${updates.role}.`,
        type: 'STAFF'
      });
      await createNotification({
        recipientType: 'ROLE',
        role: 'ADMIN',
        title: 'Staff Role Changed',
        message: `${staff.name}'s role was updated to ${updates.role}.`,
        type: 'STAFF'
      });
      await createNotification({
        recipientType: 'ROLE',
        role: 'STAFF_MANAGER',
        title: 'Staff Role Changed',
        message: `${staff.name}'s role was updated to ${updates.role}.`,
        type: 'STAFF'
      });
    }

    if (updates.employment_status) {
      await createNotification({
        recipientType: 'STAFF',
        recipientId: id,
        title: 'Account Status Update',
        message: `Your staff account status has been changed to ${updates.employment_status}.`,
        type: 'STAFF'
      });
      await createNotification({
        recipientType: 'ROLE',
        role: 'ADMIN',
        title: 'Staff Status Changed',
        message: `${staff.name}'s account status changed to ${updates.employment_status}.`,
        type: 'STAFF'
      });
      await createNotification({
        recipientType: 'ROLE',
        role: 'STAFF_MANAGER',
        title: 'Staff Status Changed',
        message: `${staff.name}'s account status changed to ${updates.employment_status}.`,
        type: 'STAFF'
      });
    }
  } catch (e) {
    console.warn('Non-blocking staff notification error:', e);
  }
}


export async function deleteStaffMember(id) {
  if (shouldUseSupabase()) {
    try {
      await supabase.from('staff').delete().eq('id', id);
    } catch {}
  }
  const list = getLocal(KEYS.STAFF, DEFAULT_STAFF);
  const filtered = list.filter(s => s.id !== Number(id));
  setLocal(KEYS.STAFF, filtered);
  logAudit({ userName: 'Staff Manager', role: 'STAFF_MANAGER', action: 'Deactivated Staff Member', entity: 'Staff', entityId: id, details: `Removed staff ID ${id}` });
  return true;
}

// ==========================================
// 3. STAFF SHIFTS & LEAVES
// ==========================================
export async function getStaffShifts() {
  const staff = await getStaffList();
  const rawShifts = getLocal(KEYS.SHIFTS, null);
  if (rawShifts && rawShifts.length > 0) return rawShifts;

  // Generate initial shifts from staff list
  const generated = staff.map((s, idx) => ({
    id: idx + 1,
    staff_id: s.id,
    name: s.name,
    role: s.role,
    department: s.department,
    shift: s.shift || 'Morning (06:00 - 14:00)',
    start: s.shift.includes('14:00') ? '14:00' : s.shift.includes('16:00') ? '16:00' : '06:00',
    end: s.shift.includes('14:00') ? '22:00' : s.shift.includes('16:00') ? '23:30' : '15:00',
    status: idx === 1 ? 'OFF DUTY' : idx === 4 ? 'ON LEAVE' : 'ON DUTY'
  }));
  setLocal(KEYS.SHIFTS, generated);
  return generated;
}

export async function updateShiftDutyStatus(shiftId, newStatus) {
  const shifts = await getStaffShifts();
  const idx = shifts.findIndex(s => s.id === Number(shiftId));
  if (idx !== -1) {
    shifts[idx].status = newStatus;
    setLocal(KEYS.SHIFTS, shifts);
    logAudit({ userName: 'Staff Manager', role: 'STAFF_MANAGER', action: 'Updated Shift Status', entity: 'Shifts', entityId: shiftId, details: `${shifts[idx].name} set to ${newStatus}` });
    return shifts[idx];
  }
  throw new Error('Shift not found.');
}

export async function getStaffLeaves() {
  const defaultLeaves = [
    {
      id: 1,
      staff_name: 'Priya Mehra',
      department: 'Reception',
      leave_type: 'Casual Leave',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      reason: 'Personal family emergency',
      status: 'APPROVED',
      approved_by: 'Rajesh Sharma'
    },
    {
      id: 2,
      staff_name: 'Karan Patel',
      department: 'Kitchen',
      leave_type: 'Medical Leave',
      start_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      reason: 'Routine health checkup',
      status: 'PENDING',
      approved_by: null
    }
  ];
  return getLocal(KEYS.LEAVES, defaultLeaves);
}

export async function processLeaveRequest(leaveId, approved = true, approverName = 'Rajesh Sharma') {
  const leaves = await getStaffLeaves();
  const idx = leaves.findIndex(l => l.id === Number(leaveId));
  if (idx !== -1) {
    leaves[idx].status = approved ? 'APPROVED' : 'REJECTED';
    leaves[idx].approved_by = approverName;
    setLocal(KEYS.LEAVES, leaves);
    logAudit({
      userName: approverName,
      role: 'STAFF_MANAGER',
      action: approved ? 'Approved Leave' : 'Rejected Leave',
      entity: 'Leave',
      entityId: leaveId,
      details: `Leave for ${leaves[idx].staff_name} marked ${leaves[idx].status}`
    });
    return leaves[idx];
  }
  throw new Error('Leave request not found.');
}

// ==========================================
// 4. FESTIVAL / SPECIAL OFFERS
// ==========================================
export async function getOffers() {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch {}
  }
  return getLocal(KEYS.OFFERS, DEFAULT_OFFERS);
}

export async function createOffer(offerData) {
  const newOffer = {
    name: offerData.name.trim(),
    description: offerData.description || '',
    discount_percent: Number(offerData.discount_percent) || 10,
    applicable_to: offerData.applicable_to || 'All',
    start_date: offerData.start_date || new Date().toISOString().split('T')[0],
    end_date: offerData.end_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    is_active: offerData.is_active !== undefined ? offerData.is_active : true,
    created_at: new Date().toISOString()
  };

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('offers')
        .insert([newOffer])
        .select()
        .single();
      if (!error && data) {
        logAudit({ userName: 'Admin', role: 'ADMIN', action: 'Created Offer', entity: 'Offers', entityId: data.id, details: `Created offer ${data.name} (${data.discount_percent}%)` });
        return data;
      }
    } catch {}
  }

  const list = getLocal(KEYS.OFFERS, DEFAULT_OFFERS);
  const id = list.length > 0 ? Math.max(...list.map(o => o.id)) + 1 : 1;
  const created = { id, ...newOffer };
  list.push(created);
  setLocal(KEYS.OFFERS, list);

  logAudit({ userName: 'Admin', role: 'ADMIN', action: 'Created Offer', entity: 'Offers', entityId: id, details: `Created offer ${created.name} (${created.discount_percent}%)` });
  return created;
}

export async function toggleOfferActive(id, isActive) {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('offers')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch {}
  }

  const list = getLocal(KEYS.OFFERS, DEFAULT_OFFERS);
  const idx = list.findIndex(o => o.id === Number(id));
  if (idx !== -1) {
    list[idx].is_active = isActive;
    setLocal(KEYS.OFFERS, list);
    logAudit({ userName: 'Admin', role: 'ADMIN', action: isActive ? 'Activated Offer' : 'Deactivated Offer', entity: 'Offers', entityId: id, details: `Offer ${list[idx].name}` });
    return list[idx];
  }
  throw new Error('Offer not found.');
}

// ==========================================
// 5. E-TICKET SCANNING & VERIFICATION
// ==========================================
export async function verifyAndCheckInTicket(ticketInput) {
  const query = (ticketInput || '').trim();
  if (!query) throw new Error('Please provide a Ticket ID or Booking Number.');

  // Ticket input could be e.g. "KIN-CT-20261004-0001", "KSC-BKG-0001", "#1", or "1"
  let cleanId = null;
  const matchBkg = query.match(/(\d+)$/);
  if (matchBkg) {
    cleanId = parseInt(matchBkg[1], 10);
  }

  let booking = null;

  if (shouldUseSupabase()) {
    try {
      // 1. Try match by ticket_id or ID
      let q = supabase
        .from('bookings')
        .select(`
          *,
          members (id, name, email, phone, user_type, membership_plans (id, name)),
          courts (id, name, sport)
        `);

      if (cleanId) {
        q = q.or(`ticket_id.eq.${query},id.eq.${cleanId}`);
      } else {
        q = q.eq('ticket_id', query);
      }

      const { data, error } = await q.maybeSingle();
      if (!error && data) booking = data;
    } catch (e) {
      console.warn('Supabase ticket lookup error:', e);
    }
  }

  // Local fallback
  if (!booking && typeof window !== 'undefined') {
    const rawLocal = localStorage.getItem('kinesis_bookings');
    if (rawLocal) {
      try {
        const localList = JSON.parse(rawLocal);
        booking = localList.find(b => 
          String(b.ticket_id || '').toLowerCase() === query.toLowerCase() ||
          String(b.id) === String(cleanId) ||
          `ksc-bkg-${String(b.id).padStart(4, '0')}` === query.toLowerCase()
        );
      } catch {}
    }
  }

  if (!booking) {
    throw new Error(`Ticket "${query}" not found in Kinesis records.`);
  }

  if (booking.status === 'cancelled') {
    throw new Error('This booking was cancelled and is no longer valid for entry.');
  }

  // Check check_in_status
  if (booking.check_in_status === 'CHECKED_IN') {
    throw new Error(`Ticket #${booking.ticket_id || booking.id} has ALREADY been checked in! (Duplicate entry prevented)`);
  }

  // Perform Check-in update
  const updatedCheckIn = {
    check_in_status: 'CHECKED_IN',
    assigned_court: booking.courts?.name || `Court #${booking.court_id}`
  };

  if (shouldUseSupabase()) {
    try {
      await supabase
        .from('bookings')
        .update(updatedCheckIn)
        .eq('id', booking.id);
    } catch {}
  }

  // Update in local cache if present
  try {
    const rawLocal = localStorage.getItem('kinesis_bookings');
    if (rawLocal) {
      const localList = JSON.parse(rawLocal);
      const idx = localList.findIndex(b => b.id === booking.id);
      if (idx !== -1) {
        localList[idx].check_in_status = 'CHECKED_IN';
        localList[idx].assigned_court = updatedCheckIn.assigned_court;
        localStorage.setItem('kinesis_bookings', JSON.stringify(localList));
      }
    }
  } catch {}

  booking.check_in_status = 'CHECKED_IN';
  booking.assigned_court = updatedCheckIn.assigned_court;

  logAudit({
    userName: 'Vikramaditya Rao',
    role: 'COURT_MANAGER',
    action: 'Verified Ticket',
    entity: 'Booking',
    entityId: booking.id,
    details: `Checked in player ${booking.members?.name || 'Guest'} on ${booking.courts?.name}`
  });

  return {
    success: true,
    booking,
    message: `Ticket Verified! ${booking.members?.name || 'Customer'} successfully checked in.`
  };
}

// ==========================================
// 6. RECEPTION POS / MANUAL TRANSACTIONS
// ==========================================
export async function recordReceptionTransaction({
  customerName,
  referenceType, // 'COURT_BOOKING', 'GEAR_ORDER', 'CAFE_ORDER', 'MEMBERSHIP', 'WALK_IN_PASS'
  amount,
  paymentMethod, // 'CASH', 'CARD', 'UPI'
  details = ''
}) {
  const transaction = {
    customer_name: customerName.trim(),
    reference_type: referenceType,
    amount: Number(amount) || 0,
    payment_method: paymentMethod || 'CASH',
    payment_status: 'PAID',
    payment_details: { details, processed_by: 'Reception Desk' },
    created_at: new Date().toISOString()
  };

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([transaction])
        .select()
        .single();
      if (!error && data) {
        logAudit({ userName: 'Reception Desk', role: 'RECEPTION', action: 'Recorded POS Sale', entity: 'Payments', entityId: data.id, details: `₹${transaction.amount} via ${transaction.paymentMethod} for ${transaction.referenceType}` });
        return data;
      }
    } catch {}
  }

  const payments = getLocal(KEYS.PAYMENTS, []);
  const id = payments.length > 0 ? Math.max(...payments.map(p => p.id || 0)) + 1 : 1;
  const created = { id, ...transaction };
  payments.unshift(created);
  setLocal(KEYS.PAYMENTS, payments);

  logAudit({ userName: 'Reception Desk', role: 'RECEPTION', action: 'Recorded POS Sale', entity: 'Payments', entityId: id, details: `₹${created.amount} via ${created.payment_method} for ${created.reference_type}` });
  return created;
}

// ==========================================
// 7. PUBLIC DYNAMIC CLUB STATISTICS
// ==========================================
export async function getPublicClubStats() {
  let totalMembers = 1250;
  let activeMembers = 1120;
  let availableCourts = 14;
  let totalPlans = 3;

  if (shouldUseSupabase()) {
    try {
      const [
        { count: mCount },
        { count: aCount },
        { count: cCount },
        { count: pCount }
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('courts').select('*', { count: 'exact', head: true }).eq('status', 'available'),
        supabase.from('membership_plans').select('*', { count: 'exact', head: true })
      ]);

      if (mCount !== null && mCount !== undefined) totalMembers = Math.max(mCount, 120);
      if (aCount !== null && aCount !== undefined) activeMembers = Math.max(aCount, 100);
      if (cCount !== null && cCount !== undefined) availableCourts = Math.max(cCount, 8);
      if (pCount !== null && pCount !== undefined) totalPlans = Math.max(pCount, 3);
    } catch (e) {
      console.warn('Supabase public stats error, using dynamic defaults:', e);
    }
  }

  return {
    totalMembers,
    activeMembers,
    availableCourts,
    sportsFacilities: 8,
    yearsOfExcellence: '12+',
    membershipPlansCount: totalPlans,
    championshipsWon: '24+'
  };
}
