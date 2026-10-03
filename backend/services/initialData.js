// Initial seed data matching database/seed.sql
export const initialMembershipPlans = [
  {
    id: 1,
    name: 'Gold',
    monthly_price: 120.0,
    court_discount: 50.0, // 50% off court bookings
    shop_discount: 20.0,  // 20% off pro shop
    bar_discount: 15.0,   // 15% off bar & drinks
    daily_booking_limit: 2,
    badge_color: '#f59e0b'
  },
  {
    id: 2,
    name: 'Silver',
    monthly_price: 75.0,
    court_discount: 25.0,
    shop_discount: 10.0,
    bar_discount: 10.0,
    daily_booking_limit: 2,
    badge_color: '#94a3b8'
  },
  {
    id: 3,
    name: 'Junior',
    monthly_price: 45.0,
    court_discount: 35.0,
    shop_discount: 15.0,
    bar_discount: 10.0,
    daily_booking_limit: 1,
    badge_color: '#06b6d4'
  }
];

export const initialCourts = [
  { id: 1, name: 'Tennis Court 1 (Clay)', sport: 'Tennis', hourly_rate: 40.0, status: 'available' },
  { id: 2, name: 'Tennis Court 2 (Hard)', sport: 'Tennis', hourly_rate: 36.0, status: 'available' },
  { id: 3, name: 'Squash Court A', sport: 'Squash', hourly_rate: 28.0, status: 'available' },
  { id: 4, name: 'Squash Court B', sport: 'Squash', hourly_rate: 28.0, status: 'maintenance' },
  { id: 5, name: 'Badminton Court 1', sport: 'Badminton', hourly_rate: 24.0, status: 'available' },
  { id: 6, name: 'Padel Court 1 (Panoramic)', sport: 'Padel', hourly_rate: 44.0, status: 'available' },
  { id: 7, name: 'Cricket Practice Net 1', sport: 'Cricket', hourly_rate: 30.0, status: 'available' },
  { id: 8, name: 'Cricket Main Ground', sport: 'Cricket', hourly_rate: 60.0, status: 'available' }
];

export const initialMembers = [
  {
    id: 1,
    name: 'Alex Mercer',
    email: 'alex.mercer@kinesis.club',
    phone: '+1 (555) 234-8901',
    plan_id: 1,
    start_date: '2026-08-01',
    expiry_date: '2027-08-01',
    status: 'active',
    created_at: '2026-08-01T10:00:00Z'
  },
  {
    id: 2,
    name: 'Elena Rostova',
    email: 'elena.rostova@kinesis.club',
    phone: '+1 (555) 345-6712',
    plan_id: 1,
    start_date: '2026-08-20',
    expiry_date: '2027-08-20',
    status: 'active',
    created_at: '2026-08-20T11:30:00Z'
  },
  {
    id: 3,
    name: 'Marcus Vance',
    email: 'marcus.vance@kinesis.club',
    phone: '+1 (555) 456-7823',
    plan_id: 2,
    start_date: '2026-09-10',
    expiry_date: '2027-09-10',
    status: 'active',
    created_at: '2026-09-10T09:15:00Z'
  },
  {
    id: 4,
    name: 'Sophia Lin',
    email: 'sophia.lin@kinesis.club',
    phone: '+1 (555) 567-8934',
    plan_id: 3,
    start_date: '2026-07-01',
    expiry_date: '2027-07-01',
    status: 'active',
    created_at: '2026-07-01T14:20:00Z'
  },
  {
    id: 5,
    name: 'Liam Gallagher',
    email: 'liam.g@kinesis.club',
    phone: '+1 (555) 678-9045',
    plan_id: 2,
    start_date: '2026-05-15',
    expiry_date: '2027-05-15',
    status: 'active',
    created_at: '2026-05-15T16:00:00Z'
  },
  {
    id: 6,
    name: 'Carlos Mendoza',
    email: 'carlos.m@kinesis.club',
    phone: '+1 (555) 789-0156',
    plan_id: 1,
    start_date: '2025-09-20',
    expiry_date: '2026-09-28',
    status: 'expired',
    created_at: '2025-09-20T10:00:00Z'
  },
  {
    id: 7,
    name: 'Emma Watson',
    email: 'emma.w@kinesis.club',
    phone: '+1 (555) 890-1267',
    plan_id: 2,
    start_date: '2025-08-01',
    expiry_date: '2026-08-30',
    status: 'inactive',
    created_at: '2025-08-01T10:00:00Z'
  },
  {
    id: 8,
    name: 'David Kim',
    email: 'david.kim@kinesis.club',
    phone: '+1 (555) 901-2378',
    plan_id: 3,
    start_date: '2026-09-18',
    expiry_date: '2027-09-18',
    status: 'active',
    created_at: '2026-09-18T13:45:00Z'
  }
];

export const initialProducts = [
  {
    id: 1,
    name: 'Wilson Pro Staff 97 v14',
    category: 'Rackets',
    price: 220.0,
    stock_quantity: 8,
    low_stock_threshold: 3,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 2,
    name: 'Head Speed MP 2024',
    category: 'Rackets',
    price: 195.0,
    stock_quantity: 2, // Low stock alert!
    low_stock_threshold: 3,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 3,
    name: 'Babolat Team All Court (4-Can)',
    category: 'Balls',
    price: 9.5,
    stock_quantity: 48,
    low_stock_threshold: 15,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 4,
    name: 'Dunlop Pro Squash Balls (3-Pack)',
    category: 'Balls',
    price: 14.0,
    stock_quantity: 24,
    low_stock_threshold: 8,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 5,
    name: 'Yonex Mavis 350 Shuttlecocks (6-Tube)',
    category: 'Accessories',
    price: 18.0,
    stock_quantity: 3, // Low stock alert!
    low_stock_threshold: 5,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 6,
    name: 'Bullpadel Hack 03 Padel Racket',
    category: 'Rackets',
    price: 260.0,
    stock_quantity: 5,
    low_stock_threshold: 2,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 7,
    name: 'Kinesis Pro Club Tech Polo',
    category: 'Apparel',
    price: 52.0,
    stock_quantity: 16,
    low_stock_threshold: 5,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 8,
    name: 'Kinesis Microfibre Quick-Dry Towel',
    category: 'Accessories',
    price: 22.0,
    stock_quantity: 22,
    low_stock_threshold: 6,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 9,
    name: 'HydroFuel Electrolyte Performance 500ml',
    category: 'Drinks & Nutrition',
    price: 4.5,
    stock_quantity: 55,
    low_stock_threshold: 12,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 10,
    name: 'PureWhey High Protein Crisp Bar',
    category: 'Drinks & Nutrition',
    price: 3.5,
    stock_quantity: 42,
    low_stock_threshold: 10,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 11,
    name: 'Artisan Roast Cold Brew Coffee',
    category: 'Café',
    price: 4.5,
    stock_quantity: 40,
    low_stock_threshold: 10,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 12,
    name: 'Club Sourdough Chicken Panini',
    category: 'Café',
    price: 8.5,
    stock_quantity: 25,
    low_stock_threshold: 8,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    id: 13,
    name: 'Acai Energy Recovery Bowl',
    category: 'Café',
    price: 7.0,
    stock_quantity: 30,
    low_stock_threshold: 8,
    created_at: '2026-09-01T08:00:00Z'
  }
];

// Helper to format ISO date string for today
const todayDateStr = new Date().toISOString().split('T')[0];

export const initialBookings = [
  {
    id: 1,
    member_id: 1,
    court_id: 1,
    booking_date: todayDateStr,
    start_time: '09:00',
    end_time: '10:00',
    price: 20.0,
    status: 'confirmed',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 2,
    member_id: 2,
    court_id: 2,
    booking_date: todayDateStr,
    start_time: '10:00',
    end_time: '11:00',
    price: 18.0,
    status: 'confirmed',
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 3,
    member_id: 3,
    court_id: 6,
    booking_date: todayDateStr,
    start_time: '11:30',
    end_time: '12:30',
    price: 33.0,
    status: 'confirmed',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 4,
    member_id: 4,
    court_id: 5,
    booking_date: todayDateStr,
    start_time: '16:00',
    end_time: '17:00',
    price: 15.6,
    status: 'confirmed',
    created_at: new Date(Date.now() - 18000000).toISOString()
  },
  {
    id: 5,
    member_id: 5,
    court_id: 3,
    booking_date: todayDateStr,
    start_time: '18:00',
    end_time: '19:00',
    price: 21.0,
    status: 'confirmed',
    created_at: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 6,
    member_id: 1,
    court_id: 6,
    booking_date: todayDateStr,
    start_time: '19:30',
    end_time: '20:30',
    price: 22.0,
    status: 'confirmed',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 7,
    member_id: 3,
    court_id: 1,
    booking_date: todayDateStr,
    start_time: '14:00',
    end_time: '15:00',
    price: 30.0,
    status: 'cancelled',
    created_at: new Date(Date.now() - 21600000).toISOString()
  }
];

export const initialSales = [
  {
    id: 1,
    product_id: 3,
    member_id: 1,
    quantity: 2,
    unit_price: 7.6,
    total: 15.2,
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 2,
    product_id: 8,
    member_id: 3,
    quantity: 1,
    unit_price: 19.8,
    total: 19.8,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 3,
    product_id: 9,
    member_id: null,
    quantity: 3,
    unit_price: 4.5,
    total: 13.5,
    created_at: new Date(Date.now() - 18000000).toISOString()
  },
  {
    id: 4,
    product_id: 7,
    member_id: 2,
    quantity: 1,
    unit_price: 41.6,
    total: 41.6,
    created_at: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 5,
    product_id: 5,
    member_id: 4,
    quantity: 1,
    unit_price: 15.3,
    total: 15.3,
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];
