/**
 * KINESIS SPORTS CLUB — CENTRAL PAYMENT VALIDATION UTILITIES
 *
 * Centralized validation, formatting, and sanitization for:
 * 1. Card Payments (12-digit card number, Cardholder Name, Expiry MM/YY, CVV 3-digits)
 * 2. UPI Payments (VPA / UPI ID validation)
 * 3. Cash Payments (Counter collection, PENDING status)
 */

/**
 * Format card number to strictly max 12 numeric digits with spaces after every 4 digits:
 * e.g., "123456789012" -> "1234 5678 9012"
 */
export function formatCardNumber(value) {
  if (!value) return '';
  const rawDigits = String(value).replace(/\D/g, '').slice(0, 12);
  const parts = rawDigits.match(/.{1,4}/g);
  return parts ? parts.join(' ') : '';
}

/**
 * Normalize card number by stripping all non-digit characters and limiting to 12 digits.
 */
export function normalizeCardNumber(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 12);
}

/**
 * Validate Card Number:
 * - Exactly 12 numeric digits
 * - No letters, no symbols
 * - Must not be empty
 */
export function validateCardNumber(value) {
  if (!value || typeof value !== 'string' && typeof value !== 'number') {
    return {
      isValid: false,
      error: 'Card number is required.',
      normalized: ''
    };
  }

  const str = String(value).trim();
  // Check if non-digits are present in the non-spaced raw string
  const strippedSpaces = str.replace(/\s+/g, '');
  if (/\D/.test(strippedSpaces)) {
    return {
      isValid: false,
      error: 'Only numbers are allowed.',
      normalized: normalizeCardNumber(str)
    };
  }

  const raw = normalizeCardNumber(str);
  if (raw.length < 12) {
    return {
      isValid: false,
      error: 'Card number must contain exactly 12 digits.',
      normalized: raw
    };
  }

  if (raw.length > 12 || strippedSpaces.length > 12) {
    return {
      isValid: false,
      error: 'Card number must contain exactly 12 digits.',
      normalized: raw
    };
  }

  return {
    isValid: true,
    error: null,
    normalized: raw,
    formatted: formatCardNumber(raw)
  };
}

/**
 * Validate Cardholder Name:
 * - Letters, spaces, hyphens, dots, apostrophes only
 * - 2 to 60 characters
 * - Meaningful name (reject empty, all spaces, numbers, or symbols)
 */
export function validateCardholderName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Cardholder name is required.' };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Cardholder name must be at least 2 characters.' };
  }

  if (trimmed.length > 60) {
    return { isValid: false, error: 'Cardholder name cannot exceed 60 characters.' };
  }

  // Allow Latin letters, spaces, hyphens, apostrophes, and dots
  const nameRegex = /^[a-zA-Z\s.'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return { isValid: false, error: 'Cardholder name must contain letters and spaces only.' };
  }

  return { isValid: true, error: null };
}

/**
 * Format Expiry input into MM/YY format:
 * e.g., "1226" -> "12/26"
 */
export function formatCardExpiry(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
  return digits;
}

/**
 * Validate Expiry Date:
 * - Must be MM/YY
 * - Valid month (01 to 12)
 * - Must not be expired dynamically based on current year/month
 */
export function validateCardExpiry(expiry) {
  if (!expiry || typeof expiry !== 'string') {
    return { isValid: false, error: 'Enter a valid expiry date (MM/YY).' };
  }

  const trimmed = expiry.trim();
  const match = trimmed.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!match) {
    // If format is not MM/YY or month is invalid (e.g. 13/28)
    if (/^\d{2}\/\d{2}$/.test(trimmed)) {
      const m = parseInt(trimmed.slice(0, 2), 10);
      if (m < 1 || m > 12) {
        return { isValid: false, error: 'Enter a valid month between 01 and 12.' };
      }
    }
    return { isValid: false, error: 'Enter a valid expiry date in MM/YY format.' };
  }

  const month = parseInt(match[1], 10);
  const year2Digit = parseInt(match[2], 10);
  const cardYear = 2000 + year2Digit;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Check if expired
  if (cardYear < currentYear || (cardYear === currentYear && month < currentMonth)) {
    return { isValid: false, error: 'Card has expired.' };
  }

  // Reject impossibly far future cards (e.g., > 25 years)
  if (cardYear > currentYear + 25) {
    return { isValid: false, error: 'Enter a valid future expiry date.' };
  }

  return { isValid: true, error: null };
}

/**
 * Format CVV:
 * - Exactly 3 digits max, non-digits stripped
 */
export function formatCardCVV(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 3);
}

/**
 * Validate CVV:
 * - Exactly 3 numeric digits
 */
export function validateCardCVV(cvv) {
  if (!cvv && cvv !== 0) {
    return { isValid: false, error: 'CVV is required.' };
  }

  const str = String(cvv).trim();
  if (/\D/.test(str)) {
    return { isValid: false, error: 'CVV must contain numbers only.' };
  }

  if (str.length !== 3) {
    return { isValid: false, error: 'CVV must contain exactly 3 digits.' };
  }

  return { isValid: true, error: null };
}

/**
 * Validate UPI ID / VPA:
 * Standard VPA format: username@bank
 * Rejects:
 * - "1235", "1234", "abc"
 * - "@"
 * - "name@"
 * - "@upi"
 * - spaces
 * - empty
 */
export function validateUpiId(upiId) {
  if (!upiId || typeof upiId !== 'string') {
    return { isValid: false, error: 'UPI ID is required.' };
  }

  const trimmed = upiId.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Enter a valid UPI ID, for example name@bank.' };
  }

  if (/\s/.test(trimmed)) {
    return { isValid: false, error: 'UPI ID cannot contain spaces.' };
  }

  if (!trimmed.includes('@')) {
    return { isValid: false, error: 'Enter a valid UPI ID, for example name@bank.' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'UPI ID must contain exactly one "@" symbol.' };
  }

  const [username, handle] = parts;
  if (!username || username.length < 2) {
    return { isValid: false, error: 'UPI ID prefix must be at least 2 characters.' };
  }

  if (!handle || handle.length < 2) {
    return { isValid: false, error: 'UPI bank handle is incomplete.' };
  }

  // Valid VPA character set: username can contain alphanumerics, dots, hyphens, underscores
  // handle must contain letters or alphanumerics (e.g., okhdfcbank, paytm, upi, icici)
  const vpaRegex = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9.\-_]{2,32}$/;
  if (!vpaRegex.test(trimmed)) {
    return { isValid: false, error: 'Enter a valid UPI ID, for example name@bank.' };
  }

  return { isValid: true, error: null };
}

/**
 * Master validation for active payment method:
 * Enforces strict method isolation: only fields of the selected method are validated.
 */
export function validatePaymentForm({ paymentMethod, cardData = {}, upiId = '' }) {
  const method = String(paymentMethod || '').toUpperCase();
  const errors = {};

  if (method === 'CASH') {
    // Cash requires pay-at-counter only; no card/UPI errors
    return {
      isValid: true,
      errors: {}
    };
  }

  if (method === 'CARD') {
    const nameCheck = validateCardholderName(cardData.name);
    if (!nameCheck.isValid) errors.name = nameCheck.error;

    const numberCheck = validateCardNumber(cardData.number);
    if (!numberCheck.isValid) errors.number = numberCheck.error;

    const expiryCheck = validateCardExpiry(cardData.expiry);
    if (!expiryCheck.isValid) errors.expiry = expiryCheck.error;

    const cvvCheck = validateCardCVV(cardData.cvv);
    if (!cvvCheck.isValid) errors.cvv = cvvCheck.error;

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  if (method === 'UPI') {
    const upiCheck = validateUpiId(upiId);
    if (!upiCheck.isValid) errors.upiId = upiCheck.error;

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  return {
    isValid: false,
    errors: { paymentMethod: 'Please select a valid payment method.' }
  };
}
