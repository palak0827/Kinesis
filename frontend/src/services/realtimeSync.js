import { supabase, shouldUseSupabase } from '../../../backend/services/supabaseClient.js';

/**
 * Kinesis Centralized Real-Time Event Bus & Supabase Channel Listener
 */

const LISTENERS = new Set();

export function subscribeToRealtimeUpdates(callback) {
  LISTENERS.add(callback);
  return () => {
    LISTENERS.delete(callback);
  };
}

export function subscribeToChanges(table, callback) {
  const handler = (payload) => {
    if (!table || payload.table === table) {
      callback(payload);
    }
  };
  LISTENERS.add(handler);
  return () => {
    LISTENERS.delete(handler);
  };
}

export function broadcastCrossTabEvent(type, payload = {}) {
  const eventData = { type, ...payload, timestamp: Date.now() };

  // Notify in-memory
  LISTENERS.forEach((cb) => {
    try {
      cb(eventData);
    } catch (e) {
      console.warn('Realtime listener error:', e);
    }
  });

  // Cross-tab broadcast
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('kinesis_realtime_ping', JSON.stringify(eventData));
    } catch {}
  }
}

export function onCrossTabEvent(callback) {
  return subscribeToRealtimeUpdates(callback);
}

export function notifyRealtimeChange(payload = {}) {
  // 1. Notify in-memory listeners
  LISTENERS.forEach((cb) => {
    try {
      cb(payload);
    } catch (e) {
      console.warn('Realtime listener callback error:', e);
    }
  });

  // 2. Notify cross-tab listeners via storage ping
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('kinesis_realtime_ping', JSON.stringify({ ...payload, timestamp: Date.now() }));
    } catch {}
  }
}

/**
 * Initialize Supabase Postgres Changes Channel
 */
let isChannelInitialized = false;

export function initSupabaseRealtime() {
  if (isChannelInitialized || !shouldUseSupabase() || !supabase) return;

  try {
    supabase
      .channel('kinesis-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        notifyRealtimeChange({ table: 'bookings', ...payload });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload) => {
        notifyRealtimeChange({ table: 'sales', ...payload });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_orders' }, (payload) => {
        notifyRealtimeChange({ table: 'cafe_orders', ...payload });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_tables' }, (payload) => {
        notifyRealtimeChange({ table: 'cafe_tables', ...payload });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        notifyRealtimeChange({ table: 'products', ...payload });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, (payload) => {
        notifyRealtimeChange({ table: 'members', ...payload });
      })
      .subscribe();

    isChannelInitialized = true;
  } catch (err) {
    console.warn('Could not initialize Supabase Realtime channel:', err);
  }

  // Cross-tab storage listener
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === 'kinesis_realtime_ping') {
        try {
          const data = JSON.parse(e.newValue || '{}');
          LISTENERS.forEach((cb) => cb(data));
        } catch {}
      }
    });
  }
}