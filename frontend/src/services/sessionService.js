/**
 * Kinesis Sports Club - Session Management (Hackathon Prototype)
 * 
 * Simple, application-level session storage using localStorage.
 * Completely replaces Supabase Auth for this prototype.
 */

const SESSION_KEY = 'kinesis_session';

export const ADMIN_CREDENTIALS = {
  email: 'admin@kinesis.club',
  password: 'AdminPassword123!'
};

/**
 * Retrieve the current session from localStorage
 * @returns {{ type: 'member'|'admin', memberId?: number } | null}
 */
export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && (session.type === 'member' || session.type === 'admin')) {
      return session;
    }
    return null;
  } catch (err) {
    console.warn('Failed to parse kinesis_session from localStorage:', err);
    return null;
  }
}

/**
 * Create and persist a member session
 * @param {number|string} memberId 
 * @returns {{ type: 'member', memberId: number }}
 */
export function createMemberSession(memberId) {
  const session = {
    type: 'member',
    memberId: Number(memberId)
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * Create and persist an admin session
 * @returns {{ type: 'admin' }}
 */
export function createAdminSession() {
  const session = {
    type: 'admin'
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

/**
 * Check if a valid member is currently logged in
 * @returns {boolean}
 */
export function isMemberLoggedIn() {
  const session = getStoredSession();
  return Boolean(session && session.type === 'member' && session.memberId);
}

/**
 * Check if an admin is currently logged in
 * @returns {boolean}
 */
export function isAdminLoggedIn() {
  const session = getStoredSession();
  return Boolean(session && session.type === 'admin');
}

/**
 * Fetch the current logged-in member record directly from Supabase
 * @param {object} supabaseClient 
 * @returns {Promise<object|null>}
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
