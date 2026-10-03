import { supabase, shouldUseSupabase } from './supabaseClient.js';

const STORAGE_KEY = 'kinesis_notifications';

// Initial fallback notifications
const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    recipient_type: 'ALL',
    recipient_id: null,
    role: 'MEMBER',
    title: 'Welcome to Kinesis Sports Club',
    message: 'Explore championship courts, pro gear shop, and artisan dining lounge.',
    type: 'SYSTEM',
    reference_id: null,
    reference_type: null,
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    recipient_type: 'ROLE',
    recipient_id: null,
    role: 'ADMIN',
    title: 'Executive Operations Online',
    message: 'All 8 club operational portals connected with role-based alerts.',
    type: 'SYSTEM',
    reference_id: null,
    reference_type: null,
    is_read: false,
    created_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 3,
    recipient_type: 'ROLE',
    recipient_id: null,
    role: 'COURT_MANAGER',
    title: 'Court Operations Ready',
    message: 'Collision prevention and e-ticket check-in system active for all 14 courts.',
    type: 'MAINTENANCE',
    reference_id: null,
    reference_type: null,
    is_read: false,
    created_at: new Date(Date.now() - 1200000).toISOString()
  }
];

// In-memory fallback for Node.js / non-browser execution
let memoryNotifications = [...INITIAL_NOTIFICATIONS];

function getStoredNotifications() {
  if (typeof window === 'undefined') return memoryNotifications;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
    return INITIAL_NOTIFICATIONS;
  } catch {
    return memoryNotifications;
  }
}

function saveStoredNotifications(list) {
  memoryNotifications = list;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * 1. CREATE A NOTIFICATION
 * Safe, non-blocking creation supporting Supabase & localStorage fallback.
 */
export async function createNotification({
  recipientType = 'ALL', // 'MEMBER', 'STAFF', 'ROLE', 'ALL'
  recipientId = null,
  role = null,           // 'MEMBER', 'ADMIN', 'COURT_MANAGER', 'RESTAURANT_MANAGER', 'BAR_MANAGER', 'SHOP_MANAGER', 'STAFF_MANAGER', 'RECEPTION'
  title,
  message,
  type = 'INFO',         // 'INFO', 'SUCCESS', 'WARNING', 'ERROR', 'BOOKING', 'ORDER', 'PAYMENT', 'MEMBERSHIP', 'INVENTORY', 'STAFF', 'SYSTEM', 'OFFER', 'MAINTENANCE'
  referenceId = null,
  referenceType = null
}) {
  if (!title || !message) return null;

  const record = {
    recipient_type: recipientType,
    recipient_id: recipientId ? String(recipientId) : null,
    role: role ? String(role).toUpperCase() : null,
    title: String(title).trim(),
    message: String(message).trim(),
    type: String(type).toUpperCase(),
    reference_id: referenceId ? String(referenceId) : null,
    reference_type: referenceType ? String(referenceType) : null,
    is_read: false,
    created_at: new Date().toISOString()
  };

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([record])
        .select()
        .single();
      if (!error && data) {
        const local = getStoredNotifications();
        local.unshift(data);
        saveStoredNotifications(local.slice(0, 200));
        return data;
      }
    } catch (e) {
      console.warn('Supabase createNotification fallback to local:', e);
    }
  }

  // Local storage fallback
  const local = getStoredNotifications();
  const maxId = local.reduce((max, n) => Math.max(max, n.id || 0), 0);
  const created = { id: maxId + 1, ...record };
  local.unshift(created);
  saveStoredNotifications(local.slice(0, 200));
  return created;
}

/**
 * 2. GET NOTIFICATIONS FOR LOGGED IN USER
 * Strict role-based isolation:
 * - Members ONLY see their own notifications & public broadcasts.
 * - Staff members ONLY see alerts relevant to their department or individual ID.
 * - Admin sees cross-department operational alerts.
 */
export async function getNotificationsForUser({ user, role, limit = 50 }) {
  if (!user) return [];

  const currentRole = (role || '').toUpperCase();
  const userId = String(user.id || '');

  // 1. Try Supabase
  if (shouldUseSupabase()) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (currentRole === 'MEMBER') {
        query = query.or(`and(recipient_type.eq.MEMBER,recipient_id.eq.${userId}),recipient_type.eq.ALL`);
      } else if (currentRole === 'ADMIN') {
        // Admin views all notifications
      } else {
        query = query.or(`recipient_id.eq.${userId},role.eq.${currentRole},recipient_type.eq.ALL`);
      }

      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase getNotifications error, using local:', e);
    }
  }

  // 2. Local Fallback with Strict Filtering
  const all = getStoredNotifications();
  return all.filter(n => {
    if (currentRole === 'MEMBER') {
      if (n.recipient_type === 'ALL' && (!n.role || n.role === 'MEMBER')) return true;
      return n.recipient_type === 'MEMBER' && String(n.recipient_id) === userId;
    }

    if (currentRole === 'ADMIN') {
      return true; // Admin views all
    }

    // Operational staff roles
    if (n.recipient_type === 'ALL') return true;
    if (String(n.recipient_id) === userId) return true;
    if (n.role && n.role.toUpperCase() === currentRole) return true;

    return false;
  }).slice(0, limit);
}

/**
 * 3. GET UNREAD NOTIFICATION COUNT
 */
export async function getUnreadCount({ user, role }) {
  const list = await getNotificationsForUser({ user, role, limit: 100 });
  return list.filter(n => !n.is_read).length;
}

/**
 * 4. MARK A SINGLE NOTIFICATION AS READ
 */
export async function markAsRead(notificationId) {
  const nId = Number(notificationId);

  if (shouldUseSupabase()) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', nId);
    } catch {}
  }

  const local = getStoredNotifications();
  const idx = local.findIndex(n => n.id === nId);
  if (idx !== -1) {
    local[idx].is_read = true;
    local[idx].read_at = new Date().toISOString();
    saveStoredNotifications(local);
  }
  return true;
}

/**
 * 5. MARK ALL NOTIFICATIONS AS READ FOR USER
 */
export async function markAllAsRead({ user, role }) {
  const list = await getNotificationsForUser({ user, role, limit: 100 });
  const ids = list.filter(n => !n.is_read).map(n => n.id);

  if (ids.length === 0) return true;

  if (shouldUseSupabase()) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', ids);
    } catch {}
  }

  const local = getStoredNotifications();
  local.forEach(n => {
    if (ids.includes(n.id)) {
      n.is_read = true;
      n.read_at = new Date().toISOString();
    }
  });
  saveStoredNotifications(local);
  return true;
}

/**
 * 6. CHECK MEMBERSHIP EXPIRY NOTIFICATIONS (DEDUPLICATED)
 */
export async function checkMembershipExpiryNotifications(member) {
  if (!member || !member.id || !member.expiry_date) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(member.expiry_date);
  expDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((expDate - today) / (1000 * 60 * 60 * 24));
  let trigger = null;
  let title = '';
  let message = '';
  let type = 'MEMBERSHIP';

  if (diffDays === 7) {
    trigger = '7_DAYS';
    title = 'Membership Expiring Soon (7 Days)';
    message = `Your ${member.membership_plans?.name || 'Club'} membership expires in 7 days on ${member.expiry_date}. Renew early to retain your discounts.`;
  } else if (diffDays === 3) {
    trigger = '3_DAYS';
    title = 'Membership Expiring Soon (3 Days)';
    message = `Your membership expires in 3 days. Renew now to avoid interruption to court bookings and discounts.`;
    type = 'WARNING';
  } else if (diffDays === 1) {
    trigger = '1_DAY';
    title = 'Membership Expires Tomorrow';
    message = `Your membership expires tomorrow (${member.expiry_date}). Renew today to keep your Gold/Silver benefits active.`;
    type = 'WARNING';
  } else if (diffDays <= 0) {
    trigger = 'EXPIRED';
    title = 'Membership Expired';
    message = `Your membership expired on ${member.expiry_date}. Member discounts and booking allowances are paused until renewed.`;
    type = 'ERROR';
  }

  if (!trigger) return;

  const refKey = `MEM_EXP_${member.id}_${trigger}_${member.expiry_date}`;

  // Check if deduplicated notification already exists
  const existing = getStoredNotifications();
  const alreadySent = existing.some(n => n.reference_id === refKey);

  if (!alreadySent) {
    await createNotification({
      recipientType: 'MEMBER',
      recipientId: member.id,
      role: 'MEMBER',
      title,
      message,
      type,
      referenceId: refKey,
      referenceType: 'MEMBERSHIP_EXPIRY'
    });
  }
}
