/**
 * Kinesis Sports Club - Session Management
 */

const SESSION_KEY = 'kinesis_session';

export const ADMIN_CREDENTIALS = {
  email: 'admin@kinesis.club',
  password: 'AdminPassword123!',
  name: 'Club Administrator',
  role: 'ADMIN',
  department: 'Operations',
  portal: 'admin'
};

export const RESTAURANT_CREDENTIALS = {
  email: 'restaurant@kinesis.club',
  password: 'Restaurant123!',
  name: 'Devendra Joshi',
  role: 'RESTAURANT_MANAGER',
  department: 'Restaurant',
  portal: 'restaurant'
};

export const BAR_CREDENTIALS = {
  email: 'bar@kinesis.club',
  password: 'Bar123!',
  name: 'Arun Nair',
  role: 'BAR_MANAGER',
  department: 'Bar',
  portal: 'bar'
};

export const SHOP_CREDENTIALS = {
  email: 'shop@kinesis.club',
  password: 'Shop123!',
  name: 'Simran Kaur',
  role: 'SHOP_MANAGER',
  department: 'Gear Shop',
  portal: 'shop-manager'
};

export const COURT_CREDENTIALS = {
  email: 'court@kinesis.club',
  password: 'Court123!',
  name: 'Vikramaditya Rao',
  role: 'COURT_MANAGER',
  department: 'Courts',
  portal: 'court-manager'
};

export const STAFF_CREDENTIALS = {
  email: 'staff@kinesis.club',
  password: 'StaffPassword123!',
  name: 'Rajesh Sharma',
  role: 'STAFF_MANAGER',
  department: 'Operations',
  portal: 'staff'
};

export const RECEPTION_CREDENTIALS = {
  email: 'reception@kinesis.club',
  password: 'Reception123!',
  name: 'Priya Mehra',
  role: 'RECEPTION',
  department: 'Reception',
  portal: 'reception'
};

/**
 * Retrieve the current session from localStorage
 */
export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && (session.type === 'member' || session.type === 'staff' || session.type === 'admin')) {
      return session;
    }
    return null;
  } catch (err) {
    console.warn('Failed to parse kinesis_session from localStorage:', err);
    return null;
  }
}

/**
 * Create and persist a member session:
 * { type: "member", memberId: "..." }
 */
export function createMemberSession(memberId) {
  const session = {
    type: 'member',
    memberId: Number(memberId),
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * Create and persist a staff session:
 * { type: "staff", staffId: "...", role: "...", department: "..." }
 */
export function createStaffSession({ staffId, role, department = '', name = '', email = '' }) {
  const session = {
    type: 'staff',
    staffId: String(staffId),
    role: String(role).toUpperCase(),
    department: String(department),
    name: String(name),
    email: String(email),
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * Clear the current session from localStorage
 */
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isMemberLoggedIn() {
  const session = getStoredSession();
  return Boolean(session && session.type === 'member' && session.memberId);
}

export function isStaffLoggedIn() {
  const session = getStoredSession();
  return Boolean(session && session.type === 'staff');
}

export function isAdminLoggedIn() {
  const session = getStoredSession();
  return Boolean(session && session.type === 'staff' && session.role === 'ADMIN');
}

/**
 * Fetch the current logged-in member record directly from Supabase
 */
export async function getCurrentMember(supabaseClient) {
  const session = getStoredSession();
  if (!session || session.type !== 'member' || !session.memberId) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('members')
      .select(`
        *,
        membership_plans (
          id,
          name,
          monthly_price,
          court_discount,
          shop_discount,
          bar_discount,
          daily_booking_limit
        )
      `)
      .eq('id', session.memberId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching member profile by session ID:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Failed to query current member:', err);
    return null;
  }
}

export function normalizeStaffRole(rawRole) {
  if (!rawRole) return null;
  const r = String(rawRole).toUpperCase();
  if (r.includes('ADMIN')) return 'ADMIN';
  if (r.includes('RESTAURANT')) return 'RESTAURANT_MANAGER';
  if (r.includes('BAR')) return 'BAR_MANAGER';
  if (r.includes('SHOP')) return 'SHOP_MANAGER';
  if (r.includes('COURT')) return 'COURT_MANAGER';
  if (r.includes('STAFF') || r.includes('HR')) return 'STAFF_MANAGER';
  if (r.includes('RECEPTION')) return 'RECEPTION';
  return null;
}

export function getRouteForRole(role) {
  const r = (role || '').toUpperCase();
  if (r === 'ADMIN') return 'admin-dashboard';
  if (r === 'RESTAURANT_MANAGER') return 'restaurant-dashboard';
  if (r === 'BAR_MANAGER') return 'bar-dashboard';
  if (r === 'SHOP_MANAGER') return 'shop-dashboard';
  if (r === 'COURT_MANAGER') return 'court-dashboard';
  if (r === 'STAFF_MANAGER') return 'staff-dashboard';
  if (r === 'RECEPTION') return 'reception-dashboard';
  if (r === 'MEMBER') return 'home';
  return 'landing';
}
