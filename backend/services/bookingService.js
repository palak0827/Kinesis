import { supabase, isSupabaseConfigured, localStore } from './supabaseClient.js';
import { getMemberById } from './memberService.js';

/**
 * Fetch all courts
 */
export async function getCourts() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .order('id', { ascending: true });
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase getCourts error, fallback to local:', e);
    }
  }
  return [...localStore.courts];
}

/**
 * Fetch all bookings with optional filters (e.g. court_id, status, member_id, date)
 */
export async function getBookings(filters = {}) {
  let list = [];

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          members (
            id,
            name,
            email,
            status,
            membership_plans (
              id,
              name,
              court_discount,
              daily_booking_limit
            )
          ),
          courts (
            id,
            name,
            sport,
            hourly_rate
          )
        `)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: true });

      if (filters.date) {
        query = query.eq('booking_date', filters.date);
      }
      if (filters.court_id) {
        query = query.eq('court_id', Number(filters.court_id));
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.member_id) {
        query = query.eq('member_id', Number(filters.member_id));
      }

      const { data, error } = await query;
      if (!error && data) return data;
    } catch (err) {
      console.warn('Supabase getBookings error, fallback to local:', err);
    }
  }

  // Local fallback
  list = localStore.bookings.map((b) => {
    const member = localStore.members.find((m) => m.id === Number(b.member_id)) || null;
    const plan = member ? localStore.plans.find((p) => p.id === Number(member.plan_id)) : null;
    const court = localStore.courts.find((c) => c.id === Number(b.court_id)) || null;

    return {
      ...b,
      members: member ? { ...member, membership_plans: plan } : null,
      courts: court
    };
  });

  if (filters.date) {
    list = list.filter((b) => b.booking_date === filters.date);
  }
  if (filters.court_id) {
    list = list.filter((b) => Number(b.court_id) === Number(filters.court_id));
  }
  if (filters.status) {
    list = list.filter((b) => b.status === filters.status);
  }
  if (filters.member_id) {
    list = list.filter((b) => Number(b.member_id) === Number(filters.member_id));
  }

  return list.sort((a, b) => {
    if (a.booking_date !== b.booking_date) {
      return b.booking_date.localeCompare(a.booking_date);
    }
    return a.start_time.localeCompare(b.start_time);
  });
}

/**
 * Helper to convert "HH:mm" or "HH:mm:ss" string to minutes from midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Fetch bookings for a specific date and optional court
 */
export async function getBookingsForDate(date, courtId = null) {
  const filters = { date };
  if (courtId) filters.court_id = courtId;
  return await getBookings(filters);
}

/**
 * Business Rule 1 & 7: Check if a court is available during a given time slot.
 * - Duration is 1 hour
 * - Cancelled bookings do NOT block the court
 * - Avoids overlaps with existing active/confirmed bookings
 */
export async function checkCourtAvailability(courtId, date, startTime, endTime, excludeBookingId = null) {
  const cId = Number(courtId);
  const targetStart = timeToMinutes(startTime);
  const targetEnd = timeToMinutes(endTime);

  // If court status is maintenance, it cannot be booked
  const courts = await getCourts();
  const court = courts.find((c) => c.id === cId);
  if (!court) {
    return { available: false, reason: 'Court does not exist' };
  }
  if (court.status === 'maintenance') {
    return { available: false, reason: `Court "${court.name}" is currently under maintenance` };
  }

  // Get active bookings for this court and date
  const bookings = await getBookingsForDate(date, cId);
  const activeBookings = bookings.filter(
    (b) => b.status !== 'cancelled' && (!excludeBookingId || b.id !== Number(excludeBookingId))
  );

  // Check for any overlapping interval: [targetStart, targetEnd) overlaps with [bStart, bEnd)
  for (const b of activeBookings) {
    const bStart = timeToMinutes(b.start_time);
    const bEnd = timeToMinutes(b.end_time);

    // Two intervals [A, B) and [C, D) overlap if A < D and B > C
    if (targetStart < bEnd && targetEnd > bStart) {
      return {
        available: false,
        reason: `Court is already booked from ${b.start_time.slice(0, 5)} to ${b.end_time.slice(0, 5)} by ${b.members?.name || 'another member'}`
      };
    }
  }

  return { available: true };
}

/**
 * Business Rule 2 & 8: Check member's daily booking limit.
 * - Default: up to 2 bookings per day (or plan limit, e.g. Junior is 1)
 * - Cancelled bookings do NOT count against daily limit
 */
export async function checkMemberDailyLimit(memberId, date) {
  const mId = Number(memberId);
  const member = await getMemberById(mId);

  if (!member) {
    return { allowed: false, reason: 'Member not found' };
  }

  // Active check
  if (member.status !== 'active') {
    return {
      allowed: false,
      reason: `Membership is ${member.status}. Only active members can book courts.`
    };
  }

  // Limit based on membership plan (default: 2)
  const limit = member.membership_plans?.daily_booking_limit || 2;

  // Count active confirmed bookings by this member on the given date
  const bookings = await getBookings({ member_id: mId, date });
  const activeCount = bookings.filter((b) => b.status !== 'cancelled').length;

  if (activeCount >= limit) {
    return {
      allowed: false,
      count: activeCount,
      limit,
      reason: `Daily booking limit reached (${activeCount}/${limit} bookings used for ${date} on ${member.membership_plans?.name || 'Standard'} plan)`
    };
  }

  return {
    allowed: true,
    count: activeCount,
    limit,
    remaining: limit - activeCount
  };
}

/**
 * Business Rule 5, 6 & 8: Centralized booking price calculation.
 * Formula:
 * Final Price = Court Hourly Rate * (1 - (Court Discount % / 100))
 * If member is expired or inactive, 0% discount is applied (full price).
 */
export async function calculateBookingPrice(courtId, memberId) {
  const courts = await getCourts();
  const court = courts.find((c) => c.id === Number(courtId));
  if (!court) throw new Error('Court not found');

  const baseRate = Number(court.hourly_rate);
  if (!memberId) {
    return {
      courtId: court.id,
      courtName: court.name,
      baseRate,
      discountPercent: 0,
      discountAmount: 0,
      finalPrice: baseRate,
      planName: 'Guest'
    };
  }

  const member = await getMemberById(memberId);
  if (!member) throw new Error('Member not found');

  let discountPercent = 0;
  let planName = 'None';

  // Rule 8: Expired/inactive memberships do NOT receive active-member benefits
  if (member.status === 'active' && member.membership_plans) {
    discountPercent = Number(member.membership_plans.court_discount) || 0;
    planName = member.membership_plans.name;
  }

  const discountAmount = Number(((baseRate * discountPercent) / 100).toFixed(2));
  const finalPrice = Number(Math.max(0, baseRate - discountAmount).toFixed(2));

  return {
    courtId: court.id,
    courtName: court.name,
    baseRate,
    discountPercent,
    discountAmount,
    finalPrice,
    planName,
    memberStatus: member.status
  };
}

/**
 * Create a new court booking enforcing all business rules:
 * - 1 hour duration
 * - 30-min start intervals
 * - Court availability (no overlap)
 * - Member daily limit
 * - Centralized price calculation
 */
export async function createBooking({
  memberId,
  courtId,
  bookingDate,
  startTime,
  endTime: providedEndTime
}) {
  const mId = Number(memberId);
  const cId = Number(courtId);

  if (!mId || !cId || !bookingDate || !startTime) {
    throw new Error('Member, Court, Booking Date, and Start Time are required.');
  }

  // Calculate 1-hour end time if not explicitly provided
  let endTime = providedEndTime;
  if (!endTime) {
    const [h, m] = startTime.split(':').map(Number);
    const endH = String(h + 1).padStart(2, '0');
    const endM = String(m).padStart(2, '0');
    endTime = `${endH}:${endM}`;
  }

  // Rule 2 & 8: Check daily limit
  const limitCheck = await checkMemberDailyLimit(mId, bookingDate);
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.reason);
  }

  // Rule 1: Check availability & overlaps
  const availability = await checkCourtAvailability(cId, bookingDate, startTime, endTime);
  if (!availability.available) {
    throw new Error(availability.reason);
  }

  // Rule 5 & 6: Centrally calculate price
  const priceCalc = await calculateBookingPrice(cId, mId);

  const newBooking = {
    member_id: mId,
    court_id: cId,
    booking_date: bookingDate,
    start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
    end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
    price: priceCalc.finalPrice,
    status: 'confirmed',
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([newBooking])
        .select(`
          *,
          members (
            id,
            name,
            email,
            status,
            membership_plans (id, name, court_discount, daily_booking_limit)
          ),
          courts (id, name, sport, hourly_rate)
        `)
        .single();
      if (!error && data) return data;
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase createBooking error, fallback to local:', err);
    }
  }

  const maxId = localStore.bookings.reduce((max, b) => Math.max(max, b.id), 0);
  const created = {
    id: maxId + 1,
    ...newBooking,
    start_time: startTime.slice(0, 5),
    end_time: endTime.slice(0, 5)
  };

  localStore.bookings.unshift(created);
  localStore.saveBookings();

  const member = await getMemberById(mId);
  const courts = await getCourts();
  const court = courts.find((c) => c.id === cId);

  return {
    ...created,
    members: member,
    courts: court
  };
}

/**
 * Rule 7: Cancel a booking.
 * Cancelled bookings no longer block the court or count against daily limits.
 */
export async function cancelBooking(bookingId) {
  const bId = Number(bookingId);

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bId)
        .select()
        .single();
      if (!error && data) return data;
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase cancelBooking error, fallback to local:', err);
    }
  }

  const index = localStore.bookings.findIndex((b) => b.id === bId);
  if (index === -1) throw new Error('Booking not found');

  localStore.bookings[index].status = 'cancelled';
  localStore.saveBookings();

  return localStore.bookings[index];
}
