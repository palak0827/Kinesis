import { supabase, shouldUseSupabase } from './supabaseClient.js';

const LOCAL_PAYMENTS_KEY = 'kinesis_local_payments';

function getLocalPayments() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_PAYMENTS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveLocalPayment(payment) {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalPayments();
    list.unshift(payment);
    window.localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(list));
  } catch (e) {}
}

/**
 * Record a payment for Court Booking, Gear Shop, Café & Bar, or Membership
 */
export async function recordPayment({
  memberId,
  referenceType,
  referenceId,
  amount,
  paymentMethod,
  paymentStatus = 'PAID',
  paymentDetails = {}
}) {
  const safeMethod = ['CASH', 'CARD', 'UPI'].includes(String(paymentMethod).toUpperCase())
    ? String(paymentMethod).toUpperCase()
    : 'CARD';

  const safeStatus = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(String(paymentStatus).toUpperCase())
    ? String(paymentStatus).toUpperCase()
    : (safeMethod === 'CASH' ? 'PENDING' : 'PAID');

  const paymentRecord = {
    member_id: memberId ? Number(memberId) : null,
    reference_type: referenceType,
    reference_id: referenceId ? Number(referenceId) : null,
    amount: Number(Number(amount).toFixed(2)),
    payment_method: safeMethod,
    payment_status: safeStatus,
    payment_details: paymentDetails,
    created_at: new Date().toISOString()
  };

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentRecord])
        .select()
        .single();

      if (!error && data) {
        saveLocalPayment(data);
        return data;
      }
    } catch (e) {
      console.warn('Supabase payments table error or pending migration, saving to local state:', e);
    }
  }

  // Graceful fallback
  const fallback = {
    id: Date.now(),
    ...paymentRecord
  };
  saveLocalPayment(fallback);
  return fallback;
}

/**
 * Get all payments for a member
 */
export async function getMemberPayments(memberId) {
  const mId = Number(memberId);
  if (!mId) return [];

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('member_id', mId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn('Could not query payments table from Supabase:', e);
    }
  }

  // Fallback to local storage
  const localList = getLocalPayments();
  return localList.filter(p => Number(p.member_id) === mId);
}
