import { supabase, shouldUseSupabase } from './supabaseClient.js';

const LOCAL_TABLES_KEY = 'kinesis_cafe_tables';

export const INITIAL_CAFE_TABLES = [
  { id: 1, table_number: 'Table 01', table_name: 'Courtyard Patio Bistro', capacity: 2, status: 'AVAILABLE', reserved_by: null, reservation_time: null, party_size: null, notes: 'Near the outdoor garden fountain' },
  { id: 2, table_number: 'Table 02', table_name: 'Courtyard Patio Bistro', capacity: 2, status: 'AVAILABLE', reserved_by: null, reservation_time: null, party_size: null, notes: 'Shaded umbrella seating' },
  { id: 3, table_number: 'Table 03', table_name: 'Grand Lounge Center', capacity: 4, status: 'OCCUPIED', reserved_by: null, reservation_time: null, party_size: null, notes: 'Active dining party' },
  { id: 4, table_number: 'Table 04', table_name: 'Grand Lounge Center', capacity: 4, status: 'AVAILABLE', reserved_by: null, reservation_time: null, party_size: null, notes: 'Prime view of central tennis courts' },
  { id: 5, table_number: 'Table 05', table_name: 'Clubhouse Window Booth', capacity: 4, status: 'RESERVED', reserved_by: 'Alex Mercer (Gold Member)', reservation_date: new Date().toISOString().split('T')[0], reservation_time: '07:30 PM', party_size: 4, notes: 'VIP Anniversary celebration' },
  { id: 6, table_number: 'Table 06', table_name: 'Clubhouse Window Booth', capacity: 4, status: 'AVAILABLE', reserved_by: null, reservation_time: null, party_size: null, notes: 'Comfortable cushioned booth' },
  { id: 7, table_number: 'Table 07', table_name: 'Executive Dining Alcove', capacity: 6, status: 'AVAILABLE', reserved_by: null, reservation_time: null, party_size: null, notes: 'Semi-private glass partition' },
  { id: 8, table_number: 'Table 08', table_name: 'Executive Dining Alcove', capacity: 6, status: 'UNDER_MAINTENANCE', reserved_by: null, reservation_time: null, party_size: null, notes: 'Wood varnish refurbishing in progress' },
  { id: 9, table_number: 'Table 09', table_name: 'Champions Banquet Round', capacity: 8, status: 'RESERVED', reserved_by: 'Rohan Sharma', reservation_date: new Date().toISOString().split('T')[0], reservation_time: '08:00 PM', party_size: 8, notes: 'Post-tournament team dinner' },
  { id: 10, table_number: 'Table 10', table_name: 'Champions Banquet Round', capacity: 8, status: 'AVAILABLE', reserved_by: null, reservation_time: null, party_size: null, notes: 'Spacious round table for large squads' }
];

function getStoredTables() {
  if (typeof window === 'undefined') return INITIAL_CAFE_TABLES;
  try {
    const raw = window.localStorage.getItem(LOCAL_TABLES_KEY);
    if (raw) return JSON.parse(raw);
    window.localStorage.setItem(LOCAL_TABLES_KEY, JSON.stringify(INITIAL_CAFE_TABLES));
    return INITIAL_CAFE_TABLES;
  } catch {
    return INITIAL_CAFE_TABLES;
  }
}

function saveStoredTables(tables) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_TABLES_KEY, JSON.stringify(tables));
  } catch {}
}

/**
 * Fetch all café tables from Supabase or fallback
 */
export async function getCafeTables() {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('cafe_tables')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        saveStoredTables(data);
        return data;
      }
    } catch (e) {
      console.warn('Supabase cafe_tables query error (table might be pending migration):', e);
    }
  }

  return getStoredTables();
}

/**
 * Update a café table's operational status
 */
export async function updateTableStatus(tableId, newStatus, reservationData = null) {
  const validStatuses = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'UNDER_MAINTENANCE'];
  const safeStatus = validStatuses.includes(newStatus) ? newStatus : 'AVAILABLE';

  const updatePayload = {
    status: safeStatus,
    updated_at: new Date().toISOString()
  };

  if (safeStatus === 'RESERVED' && reservationData) {
    updatePayload.reserved_by = reservationData.reserved_by || null;
    updatePayload.reservation_date = reservationData.reservation_date || new Date().toISOString().split('T')[0];
    updatePayload.reservation_time = reservationData.reservation_time || null;
    updatePayload.party_size = reservationData.party_size ? Number(reservationData.party_size) : null;
    updatePayload.notes = reservationData.notes || null;
  } else if (safeStatus !== 'RESERVED') {
    // Clear reservation details if no longer reserved
    updatePayload.reserved_by = null;
    updatePayload.reservation_date = null;
    updatePayload.reservation_time = null;
    updatePayload.party_size = null;
    updatePayload.notes = null;
  }

  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('cafe_tables')
        .update(updatePayload)
        .eq('id', tableId)
        .select()
        .single();

      if (!error && data) {
        // Also sync local cache
        const local = getStoredTables();
        const idx = local.findIndex(t => t.id === Number(tableId));
        if (idx !== -1) {
          local[idx] = { ...local[idx], ...data };
          saveStoredTables(local);
        }
        return data;
      }
    } catch (e) {
      console.warn('Supabase updateTableStatus failed, saving locally:', e);
    }
  }

  // Fallback to local storage update
  const local = getStoredTables();
  const idx = local.findIndex(t => t.id === Number(tableId));
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updatePayload };
    saveStoredTables(local);
    return local[idx];
  }

  throw new Error(`Table with ID ${tableId} not found.`);
}

/**
 * Calculate dynamic table status counts
 */
export function calculateTableSummary(tables = []) {
  const total = tables.length;
  let available = 0;
  let reserved = 0;
  let occupied = 0;
  let maintenance = 0;

  tables.forEach(t => {
    const s = String(t.status || '').toUpperCase();
    if (s === 'AVAILABLE') available++;
    else if (s === 'RESERVED') reserved++;
    else if (s === 'OCCUPIED') occupied++;
    else if (s === 'UNDER_MAINTENANCE') maintenance++;
  });

  return {
    total,
    available,
    reserved,
    occupied,
    maintenance
  };
}

/**
 * Reserve a table for a customer using their Club ID and existing customer record.
 * Strictly verifies customer, maintenance status, past dates, capacity, and collisions.
 */
export async function reserveCafeTable({
  tableId,
  customer,
  reservationDate,
  reservationTime,
  partySize,
  notes = ''
}) {
  const tId = Number(tableId);
  if (!tId) throw new Error('Table selection is required.');
  if (!customer || !customer.id) throw new Error('Existing customer is required for table reservation.');
  
  if (customer.status && customer.status !== 'active') {
    throw new Error('Cannot reserve table: Customer account is inactive or suspended.');
  }

  // Date validation
  if (!reservationDate || !/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
    throw new Error('Valid reservation date (YYYY-MM-DD) is required.');
  }
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (reservationDate < todayStr) {
    throw new Error('Cannot reserve table for a past date.');
  }

  if (!reservationTime || !reservationTime.trim()) {
    throw new Error('Reservation time is required.');
  }

  const pSize = parseInt(partySize, 10);
  if (isNaN(pSize) || pSize <= 0) {
    throw new Error('Party size must be a positive integer.');
  }

  const tables = await getCafeTables();
  const table = tables.find(t => t.id === tId);
  if (!table) throw new Error(`Table #${tId} not found.`);

  if (table.status === 'UNDER_MAINTENANCE') {
    throw new Error(`Table ${table.table_number} is currently under maintenance and cannot be booked.`);
  }

  if (pSize > table.capacity) {
    throw new Error(`Party size (${pSize}) exceeds table capacity (${table.capacity}).`);
  }

  // Check collision: if reserved for the same date and time
  if (table.status === 'RESERVED' && table.reservation_date === reservationDate && table.reservation_time === reservationTime) {
    throw new Error(`Table ${table.table_number} is already reserved for ${reservationDate} at ${reservationTime}.`);
  }

  if (table.status === 'OCCUPIED' && reservationDate === todayStr) {
    throw new Error(`Table ${table.table_number} is currently occupied.`);
  }

  const userTypeLabel = customer.user_type === 'WALK_IN' ? 'Walk-In Guest' : `${customer.membership_plans?.name || 'Club'} Member`;
  const reservationData = {
    reserved_by: `${customer.name} (${userTypeLabel}) [Club ID: ${customer.club_id || 'N/A'}]`,
    reservation_date: reservationDate,
    reservation_time: reservationTime,
    party_size: pSize,
    notes: notes ? notes.trim() : `Offline front-desk reservation for ${customer.name}`
  };

  const updated = await updateTableStatus(tId, 'RESERVED', reservationData);
  return {
    success: true,
    table: updated,
    customer,
    reservation: reservationData
  };
}
