import { supabase, shouldUseSupabase, localStore } from './supabaseClient.js';
import { getMemberById } from './memberService.js';
import { createNotification } from './notificationService.js';

/**
 * Fetch all courts
 */
export async function getCourts() {
  if (shouldUseSupabase()) {
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
 * Update court operational status (e.g. 'available' | 'maintenance')
 */
export async function updateCourtStatus(courtId, status) {
  const cId = Number(courtId);
  const targetStatus = String(status).toLowerCase();

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('courts')
        .update({ status: targetStatus })
        .eq('id', cId)
        .select()
        .single();
      if (!error && data) {
        const localCourt = localStore.courts.find(c => c.id === cId);
        if (localCourt) localCourt.status = targetStatus;
        return data;
      }
    } catch (e) {
      console.warn('Supabase updateCourtStatus fallback to localStore:', e);
    }
  }

  const court = localStore.courts.find(c => c.id === cId);
  if (court) {
    court.status = targetStatus;
    return court;
  }
  throw new Error(`Court #${cId} not found.`);
}

/**
 * Fetch all bookings with optional filters (e.g. court_id, status, member_id, date)
 */
export async function getBookings(filters = {}) {
  let list = [];

  if (shouldUseSupabase()) {
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
 * - Walk-In: MAX 1 court booking per day
 * - Expired member: treated as Walk-In (MAX 1 court booking per day)
 * - Active member: uses membership_plans.daily_booking_limit from PostgreSQL
 * - Cancelled bookings do NOT count against daily limit
 */
export async function checkMemberDailyLimit(memberId, date) {
  const mId = Number(memberId);
  const member = await getMemberById(mId);

  if (!member) {
    return { allowed: false, reason: 'Member not found' };
  }

  const isWalkIn = member.user_type === 'WALK_IN' || (!member.plan_id && !member.membership_plans);
  let isExpired = member.status === 'expired';
  if (member.expiry_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(member.expiry_date);
    exp.setHours(23, 59, 59, 999);
    if (today > exp) isExpired = true;
  }

  // Walk-In and expired members receive max 1 booking per day
  const limit = (isWalkIn || isExpired)
    ? 1
    : (member.membership_plans?.daily_booking_limit || 2);

  // Count active confirmed bookings by this member on the given date
  const bookings = await getBookings({ member_id: mId, date });
  const activeCount = bookings.filter((b) => b.status !== 'cancelled').length;

  if (activeCount >= limit) {
    if (isWalkIn || isExpired) {
      return {
        allowed: false,
        count: activeCount,
        limit,
        reason: 'Walk-In accounts can make one court booking per day. Become a member for higher daily booking limits.'
      };
    }
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
 * numberOfSlots = durationMinutes / 30
 * Base Price = Court 30-Min Rate * numberOfSlots
 * Final Price = Base Price - (Base Price * (Court Discount % / 100))
 * If member is Walk-In or expired, 0% discount is applied (public rate).
 */
export async function calculateBookingPrice(courtId, memberId, durationMinutes = 30) {
  const courts = await getCourts();
  const court = courts.find((c) => c.id === Number(courtId));
  if (!court) throw new Error('Court not found');

  const slotRate = Number(court.hourly_rate); // Represents the 30-minute slot rate
  const minutes = Math.max(30, Number(durationMinutes) || 30);
  const numberOfSlots = Math.max(1, Math.round(minutes / 30));
  const baseRate = Number((slotRate * numberOfSlots).toFixed(2));

  if (!memberId) {
    return {
      courtId: court.id,
      courtName: court.name,
      ratePer30Min: slotRate,
      durationMinutes: minutes,
      numberOfSlots,
      baseRate,
      discountPercent: 0,
      discountAmount: 0,
      finalPrice: baseRate,
      planName: 'Walk-In Guest'
    };
  }

  const member = await getMemberById(memberId);
  if (!member) throw new Error('Member not found');

  const isWalkIn = member.user_type === 'WALK_IN' || (!member.plan_id && !member.membership_plans);
  let isExpired = member.status === 'expired';
  if (member.expiry_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(member.expiry_date);
    exp.setHours(23, 59, 59, 999);
    if (today > exp) isExpired = true;
  }

  let discountPercent = 0;
  let planName = isWalkIn ? 'Walk-In Guest' : isExpired ? 'Expired Member' : 'None';

  // Active paid members receive tier discount
  if (!isWalkIn && !isExpired && member.status === 'active' && member.membership_plans) {
    discountPercent = Number(member.membership_plans.court_discount) || 0;
    planName = member.membership_plans.name;
  }

  const discountAmount = Number(((baseRate * discountPercent) / 100).toFixed(2));
  const finalPrice = Number(Math.max(0, baseRate - discountAmount).toFixed(2));

  return {
    courtId: court.id,
    courtName: court.name,
    ratePer30Min: slotRate,
    durationMinutes: minutes,
    numberOfSlots,
    baseRate,
    discountPercent,
    discountAmount,
    finalPrice,
    planName,
    memberStatus: member.status,
    isWalkIn
  };
}

/**
 * Create a new court booking enforcing all business rules:
 * - 30, 60, 90, 120 min durations
 * - 30-min start intervals
 * - Court availability (no overlap over entire duration)
 * - Member/Walk-In daily limit (1/day for Walk-In)
 * - Centralized price calculation with slot multiplier
 * - Audit payment method & status
 */
export async function createBooking(params = {}) {
  const memberId = params.memberId ?? params.member_id;
  const courtId = params.courtId ?? params.court_id;
  const bookingDate = params.bookingDate ?? params.booking_date ?? params.date;
  const startTime = params.startTime ?? params.start_time;
  const providedEndTime = params.endTime ?? params.end_time;
  const paymentMethod = params.paymentMethod ?? params.payment_method ?? 'UPI';
  const paymentStatus = params.paymentStatus ?? params.payment_status ?? 'PAID';

  const mId = Number(memberId);
  const cId = Number(courtId);

  if (!mId || !cId || !bookingDate || !startTime) {
    throw new Error('Member, Court, Booking Date, and Start Time are required.');
  }

  // 1. Date format & validity check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    throw new Error('Invalid booking date format. Use YYYY-MM-DD.');
  }
  const dateObj = new Date(bookingDate);
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid booking date.');
  }

  // 2. Past date check
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (bookingDate < todayStr) {
    throw new Error('Cannot book a court for a past date.');
  }

  // 3. Time format & operating hours check (06:00 to 23:00)
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(startTime)) {
    throw new Error('Invalid start time format. Use HH:mm.');
  }
  const startMins = timeToMinutes(startTime);
  if (startMins < 360 || startMins >= 1380) { // 06:00 to 23:00
    throw new Error('Court bookings are only permitted during club operating hours (06:00 to 23:00).');
  }

  // If booking for today, cannot book an elapsed or past time slot
  if (bookingDate === todayStr) {
    const currentMins = now.getHours() * 60 + now.getMinutes();
    if (startMins < currentMins) {
      throw new Error('Cannot book a court for an elapsed or past time slot.');
    }
  }

  // Calculate 30-min or provided end time
  let endTime = providedEndTime;
  if (!endTime) {
    const [h, m] = startTime.split(':').map(Number);
    const endTotal = h * 60 + m + (params.durationMinutes ? Number(params.durationMinutes) : 30);
    const endH = String(Math.floor(endTotal / 60)).padStart(2, '0');
    const endM = String(endTotal % 60).padStart(2, '0');
    endTime = `${endH}:${endM}`;
  }

  const endMins = timeToMinutes(endTime);
  if (endMins <= startMins) {
    throw new Error('End time must be after start time.');
  }
  const bookingDuration = endMins - startMins;
  if (bookingDuration < 30 || bookingDuration > 120 || bookingDuration % 30 !== 0) {
    throw new Error('Booking duration must be in 30-minute intervals between 30 and 120 minutes.');
  }

  // Rule 2 & 8: Check daily limit (Walk-In = 1, Member = plan limit)
  const limitCheck = await checkMemberDailyLimit(mId, bookingDate);
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.reason);
  }

  // Rule 1: Check availability & overlaps across the entire interval
  const availability = await checkCourtAvailability(cId, bookingDate, startTime, endTime);
  if (!availability.available) {
    throw new Error(availability.reason);
  }

  // Rule 5 & 6: Centrally calculate price with duration multiplier
  const priceCalc = await calculateBookingPrice(cId, mId, bookingDuration);

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

  if (shouldUseSupabase()) {
    try {
      // 1. Attempt PostgreSQL stored procedure with transaction-level advisory lock
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('concurrency_safe_book_court', {
          p_member_id: mId,
          p_court_id: cId,
          p_booking_date: bookingDate,
          p_start_time: newBooking.start_time,
          p_end_time: newBooking.end_time,
          p_price: priceCalc.finalPrice
        });

        if (!rpcErr && rpcRes) {
          if (!rpcRes.success) {
            throw new Error(rpcRes.message || 'This time slot was just booked by another customer. Please choose another slot.');
          }
          // Fetch full joined booking details
          const { data: bData } = await supabase
            .from('bookings')
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
            .eq('id', rpcRes.booking_id)
            .single();

          if (bData) {
            return {
              ...bData,
              payment_method: paymentMethod,
              payment_status: paymentStatus
            };
          }
        }
      } catch (rpcEx) {
        const rMsg = String(rpcEx.message || '');
        if (rMsg.includes('another customer') || rMsg.includes('SLOT_ALREADY_BOOKED')) {
          throw rpcEx;
        }
        // If RPC function is not yet migrated in Supabase, fall through to two-phase atomic validation
      }

      // 2. TWO-PHASE ATOMIC INSERTION WITH CONFLICT RESOLUTION
      // Step A: Insert candidate confirmed booking
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

      if (error) {
        if (error.code === '23505' || String(error.message).includes('unique') || String(error.message).includes('idx_unique_court_slot')) {
          throw new Error('This time slot was just booked by another customer. Please choose another slot.');
        }
        throw error;
      }

      // Step B: Re-verify against any concurrent transaction that committed with a lower ID
      // If two requests arrived almost simultaneously, the first transaction gets a lower ID.
      // The second transaction detects the collision and immediately rolls back its own record.
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id')
        .eq('court_id', cId)
        .eq('booking_date', bookingDate)
        .eq('status', 'confirmed')
        .lt('start_time', newBooking.end_time)
        .gt('end_time', newBooking.start_time)
        .lt('id', data.id);

      if (conflicts && conflicts.length > 0) {
        // Concurrency race lost: another customer acquired the slot milliseconds earlier
        await supabase.from('bookings').delete().eq('id', data.id);
        throw new Error('This time slot was just booked by another customer. Please choose another slot.');
      }

      if (data) {
        const finalBooking = {
          ...data,
          payment_method: paymentMethod,
          payment_status: paymentStatus
        };
        dispatchBookingCreatedNotifications(finalBooking, data.members, data.courts);
        return finalBooking;
      }
    } catch (err) {
      const msg = String(err.message || '');
      if (msg.includes('23505') || msg.includes('unique') || msg.includes('booked by another customer')) {
        throw new Error('This time slot was just booked by another customer. Please choose another slot.');
      }
      console.error('Supabase createBooking error:', err);
      throw err;
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

  const finalLocal = {
    ...created,
    members: member,
    courts: court
  };
  dispatchBookingCreatedNotifications(finalLocal, member, court);
  return finalLocal;
}

/**
 * Dispatch booking notifications non-blockingly
 */
async function dispatchBookingCreatedNotifications(booking, member, court) {
  try {
    const courtName = court?.name || `Court #${booking.court_id}`;
    const startTimeStr = String(booking.start_time || '').slice(0, 5);
    const endTimeStr = String(booking.end_time || '').slice(0, 5);
    const dateStr = booking.booking_date;

    // Member Notification
    await createNotification({
      recipientType: 'MEMBER',
      recipientId: booking.member_id,
      role: 'MEMBER',
      title: 'Court Booking Confirmed',
      message: `Your ${courtName} booking is confirmed for ${startTimeStr} on ${dateStr}.`,
      type: 'BOOKING',
      referenceId: booking.id,
      referenceType: 'BOOKING'
    });

    // Court Manager Notification
    await createNotification({
      recipientType: 'ROLE',
      role: 'COURT_MANAGER',
      title: 'New Court Booking',
      message: `Booking #${booking.id} created for ${courtName} (${startTimeStr} - ${endTimeStr}) on ${dateStr}.`,
      type: 'BOOKING',
      referenceId: booking.id,
      referenceType: 'BOOKING'
    });

    // Reception Notification
    await createNotification({
      recipientType: 'ROLE',
      role: 'RECEPTION',
      title: 'New Court Booking',
      message: `Court booking #${booking.id} confirmed for ${courtName} on ${dateStr}.`,
      type: 'BOOKING',
      referenceId: booking.id,
      referenceType: 'BOOKING'
    });

    // Admin Notification
    await createNotification({
      recipientType: 'ROLE',
      role: 'ADMIN',
      title: 'New Court Booking',
      message: `New booking #${booking.id} on ${courtName} (₹${booking.price || 0}).`,
      type: 'BOOKING',
      referenceId: booking.id,
      referenceType: 'BOOKING'
    });
  } catch (e) {
    console.warn('Non-blocking notification dispatch error in bookingService:', e);
  }
}

async function dispatchBookingCancelledNotifications(bookingId, booking) {
  try {
    const memberId = booking?.member_id;

    if (memberId) {
      await createNotification({
        recipientType: 'MEMBER',
        recipientId: memberId,
        role: 'MEMBER',
        title: 'Court Booking Cancelled',
        message: `Your booking #${bookingId} has been cancelled.`,
        type: 'BOOKING',
        referenceId: bookingId,
        referenceType: 'BOOKING'
      });
    }

    await createNotification({
      recipientType: 'ROLE',
      role: 'COURT_MANAGER',
      title: 'Court Booking Cancelled',
      message: `Booking #${bookingId} has been cancelled and the court is available again.`,
      type: 'BOOKING',
      referenceId: bookingId,
      referenceType: 'BOOKING'
    });

    await createNotification({
      recipientType: 'ROLE',
      role: 'RECEPTION',
      title: 'Court Booking Cancelled',
      message: `Booking #${bookingId} has been cancelled.`,
      type: 'BOOKING',
      referenceId: bookingId,
      referenceType: 'BOOKING'
    });

    await createNotification({
      recipientType: 'ROLE',
      role: 'ADMIN',
      title: 'Court Booking Cancelled',
      message: `Booking #${bookingId} was cancelled.`,
      type: 'BOOKING',
      referenceId: bookingId,
      referenceType: 'BOOKING'
    });
  } catch (e) {
    console.warn('Non-blocking notification dispatch error in bookingService:', e);
  }
}

/**
 * Rule 7: Cancel a booking.
 * Cancelled bookings no longer block the court or count against daily limits.
 */
export async function cancelBooking(bookingId) {
  const bId = Number(bookingId);

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bId)
        .select()
        .single();
      if (!error && data) {
        dispatchBookingCancelledNotifications(bId, data);
        return data;
      }
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase cancelBooking error, fallback to local:', err);
    }
  }

  const index = localStore.bookings.findIndex((b) => b.id === bId);
  if (index === -1) throw new Error('Booking not found');

  localStore.bookings[index].status = 'cancelled';
  localStore.saveBookings();

  dispatchBookingCancelledNotifications(bId, localStore.bookings[index]);
  return localStore.bookings[index];
}

