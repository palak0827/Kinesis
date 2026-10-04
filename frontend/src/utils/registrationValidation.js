/**
 * KINESIS SPORTS CLUB — REGISTRATION VALIDATION MODULE
 * 
 * Strict boundary rules:
 * - NAME: 2-70 chars, letters, spaces, hyphens, apostrophes only. No numbers or special symbols.
 * - EMAIL: Exact .com or .ac.in domains only. No characters allowed after domain.
 * - PHONE: Exactly 10 numeric digits.
 * - DOB: Valid calendar date, not in future, realistic age (5-120).
 * - PASSWORD: Min 6 characters.
 * - CONFIRM: Exact match with password.
 */

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.(com|ac\.in)$/i;
export const PHONE_REGEX = /^\d{10}$/;

export function calculateAge(dobString) {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function validateName(name) {
  if (!name || !name.trim()) {
    return 'Full name is required.';
  }
  const trimmed = name.trim();
  if (/\d/.test(trimmed)) {
    return 'Name cannot contain numbers.';
  }
  if (/[^A-Za-z\s'-]/.test(trimmed)) {
    return 'Name contains unsupported special characters.';
  }
  if (trimmed.length < 2) {
    return 'Name must be at least 2 characters long.';
  }
  if (trimmed.length > 70) {
    return 'Name cannot exceed 70 characters.';
  }
  return null;
}

export function validateEmail(email) {
  if (!email || !email.trim()) {
    return 'Email address is required.';
  }
  const trimmed = email.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Invalid email address. Only valid .com or .ac.in domains are accepted.';
  }
  return null;
}

export function validatePhone(phone) {
  if (!phone || !phone.trim()) {
    return 'Phone number is required.';
  }
  const trimmed = phone.trim();
  if (!PHONE_REGEX.test(trimmed)) {
    return 'Phone number must be exactly 10 digits.';
  }
  return null;
}

export function validateDob(dobString) {
  if (!dobString) {
    return 'Date of birth is required.';
  }
  const parts = dobString.split('-');
  if (parts.length !== 3) {
    return 'Invalid date of birth format.';
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (parts[0].length !== 4 || isNaN(year) || isNaN(month) || isNaN(day)) {
    return 'Invalid date of birth format.';
  }
  if (month < 1 || month > 12) {
    return 'Invalid month in date of birth.';
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return `Invalid day for month (${day} exceeds max of ${daysInMonth}).`;
  }

  const dobDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dobDate > today) {
    return 'Date of birth cannot be in the future.';
  }

  const currentYear = today.getFullYear();
  if (year < currentYear - 120) {
    return 'Date of birth is too old. Age cannot exceed 120 years.';
  }

  let age = currentYear - year;
  const m = today.getMonth() - (month - 1);
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }

  if (age < 5) {
    return 'Member must be at least 5 years old to register.';
  }

  return null;
}

export function validatePassword(password) {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  return null;
}

export function validateConfirm(password, confirm) {
  if (!confirm) {
    return 'Please confirm your password.';
  }
  if (password !== confirm) {
    return 'Passwords do not match.';
  }
  return null;
}
