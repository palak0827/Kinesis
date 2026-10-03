import { createClient } from '@supabase/supabase-js';
import {
  initialBookings,
  initialCourts,
  initialMembers,
  initialMembershipPlans,
  initialProducts,
  initialSales
} from './initialData.js';

const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_URL
  : '';
const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-supabase-anon-key-here' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const DEMO_MODE_STORAGE_KEY = 'kinesis_local_demo_mode';

export const isDemoMode = () =>
  import.meta.env?.DEV === true &&
  typeof window !== 'undefined' &&
  window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === 'true';

export function enableDemoMode() {
  if (import.meta.env?.DEV !== true) {
    throw new Error('Local demo access is only available in development.');
  }
  window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'true');
}

export function disableDemoMode() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
  }
}

export const shouldUseSupabase = () => isSupabaseConfigured && !isDemoMode();

function cloneRecords(records) {
  return records.map((record) => ({ ...record }));
}

function readCollection(name, initialRecords) {
  if (typeof window === 'undefined') return cloneRecords(initialRecords);

  const stored = window.localStorage.getItem(`kinesis_demo_${name}`);
  if (!stored) return cloneRecords(initialRecords);

  try {
    const records = JSON.parse(stored);
    if (Array.isArray(records)) return records;
    throw new Error(`Stored demo ${name} data is not an array`);
  } catch (error) {
    console.error(`Unable to load saved demo ${name} data; using seed data.`, error);
    return cloneRecords(initialRecords);
  }
}

function saveCollection(name, records) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(`kinesis_demo_${name}`, JSON.stringify(records));
  }
}

export const localStore = {
  plans: readCollection('plans', initialMembershipPlans),
  courts: readCollection('courts', initialCourts),
  members: readCollection('members', initialMembers),
  bookings: readCollection('bookings', initialBookings),
  products: readCollection('products', initialProducts),
  sales: readCollection('sales', initialSales),
  cafeOrders: readCollection('cafe_orders', []),
  cafeOrderItems: readCollection('cafe_order_items', []),
  savePlans() {
    saveCollection('plans', this.plans);
  },
  saveCourts() {
    saveCollection('courts', this.courts);
  },
  saveMembers() {
    saveCollection('members', this.members);
  },
  saveBookings() {
    saveCollection('bookings', this.bookings);
  },
  saveProducts() {
    saveCollection('products', this.products);
  },
  saveSales() {
    saveCollection('sales', this.sales);
  },
  saveCafeOrders() {
    saveCollection('cafe_orders', this.cafeOrders);
  },
  saveCafeOrderItems() {
    saveCollection('cafe_order_items', this.cafeOrderItems);
  },
  resetToDefault() {
    this.plans = cloneRecords(initialMembershipPlans);
    this.courts = cloneRecords(initialCourts);
    this.members = cloneRecords(initialMembers);
    this.bookings = cloneRecords(initialBookings);
    this.products = cloneRecords(initialProducts);
    this.sales = cloneRecords(initialSales);
    this.cafeOrders = [];
    this.cafeOrderItems = [];
    this.savePlans();
    this.saveCourts();
    this.saveMembers();
    this.saveBookings();
    this.saveProducts();
    this.saveSales();
    this.saveCafeOrders();
    this.saveCafeOrderItems();
  }
};
