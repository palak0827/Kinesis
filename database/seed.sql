-- =============================================================================
-- KINESIS Sports Club Management System - Seed Data
-- =============================================================================

-- 1. Insert Membership Plans
INSERT INTO membership_plans (id, name, monthly_price, court_discount, shop_discount, bar_discount, daily_booking_limit)
VALUES
    (1, 'Gold', 499.00, 50.00, 20.00, 15.00, 2),
    (2, 'Silver', 299.00, 25.00, 10.00, 10.00, 2),
    (3, 'Junior', 199.00, 35.00, 15.00, 10.00, 1)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    monthly_price = EXCLUDED.monthly_price,
    court_discount = EXCLUDED.court_discount,
    shop_discount = EXCLUDED.shop_discount,
    bar_discount = EXCLUDED.bar_discount,
    daily_booking_limit = EXCLUDED.daily_booking_limit;

-- Reset sequence if needed
SELECT setval('membership_plans_id_seq', (SELECT MAX(id) FROM membership_plans));

-- 2. Insert Members
INSERT INTO members (id, name, email, phone, plan_id, start_date, expiry_date, status, created_at)
VALUES
    (1, 'Alex Mercer', 'alex.mercer@kinesis.club', '+1 (555) 234-8901', 1, CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '305 days', 'active', NOW() - INTERVAL '60 days'),
    (2, 'Elena Rostova', 'elena.rostova@kinesis.club', '+1 (555) 345-6712', 1, CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE + INTERVAL '325 days', 'active', NOW() - INTERVAL '40 days'),
    (3, 'Marcus Vance', 'marcus.vance@kinesis.club', '+1 (555) 456-7823', 2, CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '345 days', 'active', NOW() - INTERVAL '20 days'),
    (4, 'Sophia Lin', 'sophia.lin@kinesis.club', '+1 (555) 567-8934', 3, CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE + INTERVAL '275 days', 'active', NOW() - INTERVAL '90 days'),
    (5, 'Liam Gallagher', 'liam.g@kinesis.club', '+1 (555) 678-9045', 2, CURRENT_DATE - INTERVAL '150 days', CURRENT_DATE + INTERVAL '215 days', 'active', NOW() - INTERVAL '150 days'),
    (6, 'Carlos Mendoza', 'carlos.m@kinesis.club', '+1 (555) 789-0156', 1, CURRENT_DATE - INTERVAL '370 days', CURRENT_DATE - INTERVAL '5 days', 'expired', NOW() - INTERVAL '370 days'),
    (7, 'Emma Watson', 'emma.w@kinesis.club', '+1 (555) 890-1267', 2, CURRENT_DATE - INTERVAL '400 days', CURRENT_DATE - INTERVAL '35 days', 'inactive', NOW() - INTERVAL '400 days'),
    (8, 'David Kim', 'david.kim@kinesis.club', '+1 (555) 901-2378', 3, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '350 days', 'active', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('members_id_seq', (SELECT MAX(id) FROM members));

-- 3. Insert Courts (Rates per 30-minute slot)
INSERT INTO courts (id, name, sport, hourly_rate, status)
VALUES
    (1, 'Tennis Court 1 (Clay)', 'Tennis', 200.00, 'available'),
    (2, 'Tennis Court 2 (Hard)', 'Tennis', 200.00, 'available'),
    (3, 'Squash Court A', 'Squash', 150.00, 'available'),
    (4, 'Squash Court B', 'Squash', 150.00, 'maintenance'),
    (5, 'Badminton Court 1', 'Badminton', 100.00, 'available'),
    (6, 'Padel Court 1 (Panoramic)', 'Padel', 250.00, 'available'),
    (7, 'Cricket Practice Net 1', 'Cricket', 200.00, 'available'),
    (8, 'Cricket Main Ground', 'Cricket', 400.00, 'available')
ON CONFLICT (id) DO NOTHING;

SELECT setval('courts_id_seq', (SELECT MAX(id) FROM courts));

-- 4. Insert Products (Gear Shop & Café & Bar)
INSERT INTO products (id, name, category, price, stock_quantity, low_stock_threshold, created_at)
VALUES
    (1, 'Wilson Pro Staff 97 v14', 'Rackets', 499.00, 8, 3, NOW() - INTERVAL '30 days'),
    (2, 'Head Speed MP 2024', 'Rackets', 449.00, 2, 3, NOW() - INTERVAL '30 days'),
    (3, 'Babolat Team All Court (4-Can)', 'Balls', 249.00, 48, 15, NOW() - INTERVAL '30 days'),
    (4, 'Dunlop Pro Squash Balls (3-Pack)', 'Balls', 199.00, 24, 8, NOW() - INTERVAL '30 days'),
    (5, 'Yonex Mavis 350 Shuttlecocks (6-Tube)', 'Accessories', 249.00, 3, 5, NOW() - INTERVAL '30 days'),
    (6, 'Bullpadel Hack 03 Padel Racket', 'Rackets', 499.00, 5, 2, NOW() - INTERVAL '30 days'),
    (7, 'Kinesis Pro Club Tech Polo', 'Apparel', 449.00, 16, 5, NOW() - INTERVAL '30 days'),
    (8, 'Kinesis Microfibre Quick-Dry Towel', 'Accessories', 199.00, 22, 6, NOW() - INTERVAL '30 days'),
    (9, 'HydroFuel Electrolyte Performance 500ml', 'Drinks', 99.00, 55, 12, NOW() - INTERVAL '30 days'),
    (10, 'PureWhey High Protein Crisp Bar', 'Snacks', 119.00, 42, 10, NOW() - INTERVAL '30 days'),
    (11, 'Artisan Roast Cold Brew Coffee', 'Drinks', 149.00, 40, 10, NOW() - INTERVAL '30 days'),
    (12, 'Club Sourdough Chicken Panini', 'Food', 249.00, 25, 8, NOW() - INTERVAL '30 days'),
    (13, 'Acai Energy Recovery Bowl', 'Food', 279.00, 30, 8, NOW() - INTERVAL '30 days'),
    (14, 'Iced Tea', 'Drinks', 109.00, 40, 8, NOW() - INTERVAL '20 days'),
    (15, 'Cold Coffee', 'Drinks', 129.00, 35, 8, NOW() - INTERVAL '20 days'),
    (16, 'Cold Brew', 'Drinks', 149.00, 30, 6, NOW() - INTERVAL '20 days'),
    (17, 'Protein Shake', 'Drinks', 199.00, 30, 6, NOW() - INTERVAL '20 days'),
    (18, 'Fresh Fruit Juice', 'Drinks', 129.00, 35, 8, NOW() - INTERVAL '20 days'),
    (19, 'Electrolyte Drink', 'Drinks', 99.00, 50, 10, NOW() - INTERVAL '15 days'),
    (20, 'Virgin Mojito', 'Mocktails', 149.00, 35, 8, NOW() - INTERVAL '15 days'),
    (21, 'Blue Lagoon', 'Mocktails', 159.00, 30, 6, NOW() - INTERVAL '15 days'),
    (22, 'Berry Fizz', 'Mocktails', 169.00, 25, 6, NOW() - INTERVAL '15 days'),
    (23, 'Tropical Punch', 'Mocktails', 179.00, 25, 5, NOW() - INTERVAL '15 days'),
    (24, 'Watermelon Cooler', 'Mocktails', 149.00, 30, 6, NOW() - INTERVAL '15 days'),
    (25, 'French Fries', 'Snacks', 129.00, 40, 10, NOW() - INTERVAL '15 days'),
    (26, 'Veg Sandwich', 'Snacks', 149.00, 30, 8, NOW() - INTERVAL '15 days'),
    (27, 'Grilled Sandwich', 'Snacks', 179.00, 25, 6, NOW() - INTERVAL '15 days'),
    (28, 'Protein Bar', 'Snacks', 119.00, 60, 12, NOW() - INTERVAL '15 days'),
    (29, 'Nachos', 'Snacks', 169.00, 35, 8, NOW() - INTERVAL '15 days'),
    (30, 'Veg Panini', 'Food', 199.00, 25, 6, NOW() - INTERVAL '15 days'),
    (31, 'Chicken Panini', 'Food', 249.00, 20, 5, NOW() - INTERVAL '15 days'),
    (32, 'Paneer Wrap', 'Food', 219.00, 20, 5, NOW() - INTERVAL '15 days'),
    (33, 'Chicken Wrap', 'Food', 249.00, 18, 5, NOW() - INTERVAL '15 days'),
    (34, 'Pasta', 'Food', 229.00, 20, 5, NOW() - INTERVAL '15 days'),
    (35, 'Healthy Bowl', 'Food', 249.00, 22, 5, NOW() - INTERVAL '15 days'),
    (36, 'Recovery Bowl', 'Food', 279.00, 22, 5, NOW() - INTERVAL '15 days'),
    (37, 'Mineral Water', 'Drinks', 40.00, 60, 15, NOW() - INTERVAL '10 days'),
    (38, 'Fresh Lime Soda', 'Drinks', 89.00, 40, 10, NOW() - INTERVAL '10 days'),
    (39, 'Lemon Mint Cooler', 'Drinks', 99.00, 35, 10, NOW() - INTERVAL '10 days'),
    (40, 'Gray-Nicolls Powerbow Cricket Bat', 'Rackets', 499.00, 6, 2, NOW() - INTERVAL '10 days'),
    (41, 'SG Test Cricket Leather Ball', 'Balls', 349.00, 20, 6, NOW() - INTERVAL '10 days'),
    (42, 'Yonex Astrox 88D Pro Badminton Racket', 'Rackets', 449.00, 8, 2, NOW() - INTERVAL '10 days'),
    (43, 'Kinesis Pro Performance T-Shirt', 'Apparel', 299.00, 20, 6, NOW() - INTERVAL '10 days'),
    (44, 'Kinesis Tour Club Sports Bag', 'Accessories', 399.00, 12, 4, NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO UPDATE
SET price = EXCLUDED.price,
    category = EXCLUDED.category,
    name = EXCLUDED.name;

SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- 5. Insert Bookings (for Today & Recent)
INSERT INTO bookings (id, member_id, court_id, booking_date, start_time, end_time, price, status, created_at)
VALUES
    -- Alex Mercer (Gold - 50% off ₹40 = ₹20)
    (1, 1, 1, CURRENT_DATE, '09:00:00', '10:00:00', 20.00, 'confirmed', NOW() - INTERVAL '1 day'),
    -- Elena Rostova (Gold - 50% off ₹36 = ₹18)
    (2, 2, 2, CURRENT_DATE, '10:00:00', '11:00:00', 18.00, 'confirmed', NOW() - INTERVAL '2 days'),
    -- Marcus Vance (Silver - 25% off ₹44 = ₹33)
    (3, 3, 6, CURRENT_DATE, '11:30:00', '12:30:00', 33.00, 'confirmed', NOW() - INTERVAL '1 day'),
    -- Sophia Lin (Junior - 35% off ₹24 = ₹15.60)
    (4, 4, 5, CURRENT_DATE, '16:00:00', '17:00:00', 15.60, 'confirmed', NOW() - INTERVAL '5 hours'),
    -- Liam Gallagher (Silver - 25% off ₹28 = ₹21)
    (5, 5, 3, CURRENT_DATE, '18:00:00', '19:00:00', 21.00, 'confirmed', NOW() - INTERVAL '3 hours'),
    -- Alex Mercer 2nd booking today (allowed: limit is 2)
    (6, 1, 6, CURRENT_DATE, '19:30:00', '20:30:00', 22.00, 'confirmed', NOW() - INTERVAL '1 hour'),
    -- Tomorrow booking
    (7, 2, 1, CURRENT_DATE + INTERVAL '1 day', '09:00:00', '10:00:00', 20.00, 'confirmed', NOW() - INTERVAL '10 hours'),
    -- Cancelled booking example
    (8, 3, 1, CURRENT_DATE, '14:00:00', '15:00:00', 30.00, 'cancelled', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));

-- 6. Insert Sales (with member discount applied)
INSERT INTO sales (id, product_id, member_id, quantity, unit_price, total, created_at)
VALUES
    -- Alex Mercer (Gold - 20% discount on ₹9.50 = ₹7.60 each, qty 2 = ₹15.20)
    (1, 3, 1, 2, 7.60, 15.20, NOW() - INTERVAL '2 days'),
    -- Marcus Vance (Silver - 10% discount on ₹22.00 = ₹19.80, qty 1 = ₹19.80)
    (2, 8, 3, 1, 19.80, 19.80, NOW() - INTERVAL '1 day'),
    -- Non-member / walk-in guest purchase (0% discount, full price ₹4.50, qty 3 = ₹13.50)
    (3, 9, NULL, 3, 4.50, 13.50, NOW() - INTERVAL '5 hours'),
    -- Elena Rostova (Gold - 20% discount on ₹52.00 = ₹41.60, qty 1 = ₹41.60)
    (4, 7, 2, 1, 41.60, 41.60, NOW() - INTERVAL '3 hours'),
    -- Sophia Lin (Junior - 15% discount on ₹18.00 = ₹15.30, qty 1 = ₹15.30)
    (5, 5, 4, 1, 15.30, 15.30, NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

SELECT setval('sales_id_seq', (SELECT MAX(id) FROM sales));
