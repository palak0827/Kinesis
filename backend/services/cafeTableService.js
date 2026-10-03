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
