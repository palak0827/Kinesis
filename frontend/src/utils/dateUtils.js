/**
 * Kinesis Sports Club - Centralized Date & Time Utilities
 * Single source of truth for all date/time operations.
 * No hardcoded dates anywhere in the application.
 */

/**
 * Returns today's date as YYYY-MM-DD in local timezone.
 */
export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns current datetime as ISO 8601 string.
 */
export function nowISO() {
  return new Date().toISOString();
}

/**
 * Format a date string or Date object to a readable locale string.
 * @param {string|Date} value
 * @param {object} opts - Intl.DateTimeFormat options
 */
export function formatDate(value, opts = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (!value) return 'N/A';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', opts);
}

/**
 * Format a time string (HH:MM or HH:MM:SS) to 12-hour format.
 */
export function formatTime(value) {
  if (!value) return '';
  // Handle ISO strings
  if (value.includes('T')) {
    return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  // Handle HH:MM or HH:MM:SS
  const parts = value.split(':');
  if (parts.length < 2) return value;
  const h = parseInt(parts[0], 10);
  const min = parts[1];
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${period}`;
}

/**
 * Format an ISO datetime string to a short date + time display.
 */
export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Returns YYYY-MM-DD for a date N days from today.
 * @param {number} days - positive = future, negative = past
 */
export function relativeDateStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns YYYY-MM-DD for a date N months from today.
 * @param {number} months
 */
export function futureMonthStr(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Checks whether a given expiry date is still in the future (not expired).
 * @param {string} expiryDate - YYYY-MM-DD
 */
export function isNotExpired(expiryDate) {
  if (!expiryDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(23, 59, 59, 999);
  return today <= exp;
}

/**
 * Returns number of days remaining until expiry.
 * Negative = already expired.
 * @param {string} expiryDate - YYYY-MM-DD
 */
export function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - today) / 86400000);
}

/**
 * Calculate age from a date of birth string (YYYY-MM-DD).
 */
export function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Returns true if a booking date string is today or in the future.
 */
export function isDateTodayOrFuture(dateStr) {
  if (!dateStr) return false;
  const today = todayStr();
  return dateStr >= today;
}

/**
 * Format a duration in minutes to a human-readable string.
 */
export function formatDuration(minutes) {
  const m = Number(minutes) || 0;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}