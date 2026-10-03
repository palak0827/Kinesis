-- ==============================================================================
-- Kinesis Sports Club Management System
-- Migration: Realistic Prototype Pricing (Courts, Memberships, Café & Bar)
-- File: database/migration_realistic_pricing.sql
-- ==============================================================================

-- 1. MEMBERSHIP PLANS PRICING UPDATE (Affordable Prototype Range ₹100 - ₹500)
-- JUNIOR: ₹199 / month
-- SILVER: ₹299 / month
-- GOLD:   ₹499 / month
UPDATE membership_plans SET monthly_price = 499.00 WHERE LOWER(name) = 'gold';
UPDATE membership_plans SET monthly_price = 299.00 WHERE LOWER(name) = 'silver';
UPDATE membership_plans SET monthly_price = 199.00 WHERE LOWER(name) = 'junior';

-- 2. SPORTS COURTS PRICING UPDATE (30-Minute Slot Rates ₹100 - ₹400)
-- Badminton:            ₹100 / 30 min
-- Table Tennis:         ₹100 / 30 min
-- Squash:               ₹150 / 30 min
-- Tennis:               ₹200 / 30 min
-- Padel:                ₹250 / 30 min
-- Cricket Practice Net: ₹200 / 30 min
-- Cricket Main Ground:  ₹400 / 30 min

UPDATE courts SET hourly_rate = 200.00 WHERE LOWER(sport) = 'tennis';
UPDATE courts SET hourly_rate = 150.00 WHERE LOWER(sport) = 'squash';
UPDATE courts SET hourly_rate = 100.00 WHERE LOWER(sport) = 'badminton';
UPDATE courts SET hourly_rate = 250.00 WHERE LOWER(sport) = 'padel';
UPDATE courts SET hourly_rate = 200.00 WHERE LOWER(name) LIKE '%cricket practice net%' OR (LOWER(sport) = 'cricket' AND LOWER(name) LIKE '%net%');
UPDATE courts SET hourly_rate = 400.00 WHERE LOWER(name) LIKE '%cricket main ground%' OR (LOWER(sport) = 'cricket' AND LOWER(name) LIKE '%ground%');

-- Ensure Table Tennis Arena 1 exists safely
INSERT INTO courts (name, sport, hourly_rate, status)
SELECT 'Table Tennis Arena 1', 'Table Tennis', 100.00, 'available'
WHERE NOT EXISTS (
  SELECT 1 FROM courts WHERE LOWER(sport) = 'table tennis' OR LOWER(name) LIKE '%table tennis%'
);
UPDATE courts SET hourly_rate = 100.00 WHERE LOWER(sport) = 'table tennis';

-- 3. GEAR SHOP RETAIL PRICING PRESERVATION
-- Do NOT arbitrarily reduce retail sports equipment to food/drink price levels
UPDATE products SET price = 5499.00 WHERE name = 'Wilson Pro Staff 97 v14';
UPDATE products SET price = 4999.00 WHERE name = 'Head Speed MP 2024';
UPDATE products SET price = 499.00  WHERE name = 'Babolat Team All Court (4-Can)';
UPDATE products SET price = 399.00  WHERE name = 'Dunlop Pro Squash Balls (3-Pack)';
UPDATE products SET price = 449.00  WHERE name = 'Yonex Mavis 350 Shuttlecocks (6-Tube)';
UPDATE products SET price = 5999.00 WHERE name = 'Bullpadel Hack 03 Padel Racket';
UPDATE products SET price = 1199.00 WHERE name = 'Kinesis Pro Club Tech Polo';
UPDATE products SET price = 399.00  WHERE name = 'Kinesis Microfibre Quick-Dry Towel';
UPDATE products SET price = 3299.00 WHERE name = 'Yonex Astrox 88D Pro Badminton Racket';
UPDATE products SET price = 4499.00 WHERE name = 'Gray-Nicolls Powerbow Cricket Bat';
UPDATE products SET price = 599.00  WHERE name = 'SG Test Cricket Leather Ball';
UPDATE products SET price = 899.00  WHERE name = 'Kinesis Pro Performance T-Shirt';
UPDATE products SET price = 1999.00 WHERE name = 'Kinesis Tour Club Sports Bag';

-- 4. CAFÉ & BAR REALISTIC INR PRICING (Target Range ₹30 - ₹250)
-- Update existing items
UPDATE products SET price = 120.00, category = 'Drinks'    WHERE name = 'Artisan Roast Cold Brew Coffee' OR name = 'Cold Brew';
UPDATE products SET price = 190.00, category = 'Food'      WHERE name = 'Club Sourdough Chicken Panini';
UPDATE products SET price = 220.00, category = 'Food'      WHERE name = 'Acai Energy Recovery Bowl';
UPDATE products SET price = 110.00, category = 'Drinks'    WHERE name = 'Cold Coffee';
UPDATE products SET price = 80.00,  category = 'Drinks'    WHERE name = 'Americano';
UPDATE products SET price = 90.00,  category = 'Drinks'    WHERE name = 'Espresso';
UPDATE products SET price = 100.00, category = 'Drinks'    WHERE name = 'Club Latte';
UPDATE products SET price = 160.00, category = 'Drinks'    WHERE name = 'Power Berry Smoothie' OR name = 'Power Berry';
UPDATE products SET price = 150.00, category = 'Drinks'    WHERE name = 'Mango Rush Smoothie' OR name = 'Mango Rush';
UPDATE products SET price = 140.00, category = 'Drinks'    WHERE name = 'Green Fuel Detox' OR name = 'Green Fuel';
UPDATE products SET price = 160.00, category = 'Drinks'    WHERE name = 'PureWhey Protein Shake' OR name = 'Protein Shake';
UPDATE products SET price = 80.00,  category = 'Drinks'    WHERE name = 'HydroFuel Electrolyte Performance 500ml' OR name = 'Electrolyte Drink';
UPDATE products SET price = 80.00,  category = 'Snacks'    WHERE name = 'PureWhey High Protein Crisp Bar' OR name = 'PureWhey Protein Bar' OR name = 'Protein Bar';
UPDATE products SET price = 120.00, category = 'Mocktails' WHERE name = 'Mint Smash';
UPDATE products SET price = 140.00, category = 'Mocktails' WHERE name = 'Citrus Fizz' OR name = 'Berry Fizz';
UPDATE products SET price = 140.00, category = 'Mocktails' WHERE name = 'Berry Spark';
UPDATE products SET price = 120.00, category = 'Mocktails' WHERE name = 'Club Cooler' OR name = 'Watermelon Cooler';
UPDATE products SET price = 160.00, category = 'Food'      WHERE name = 'Club Panini' OR name = 'Veg Panini';
UPDATE products SET price = 200.00, category = 'Food'      WHERE name = 'Grilled Chicken Wrap' OR name = 'Chicken Wrap';
UPDATE products SET price = 170.00, category = 'Food'      WHERE name = 'Veggie Melt Panini' OR name = 'Paneer Wrap';
UPDATE products SET price = 200.00, category = 'Food'      WHERE name = 'Protein Harvest Bowl' OR name = 'Healthy Bowl';
UPDATE products SET price = 80.00,  category = 'Snacks'    WHERE name = 'Almond Energy Bites';
UPDATE products SET price = 100.00, category = 'Snacks'    WHERE name = 'Fresh Fruit Cup';

-- Safely insert genuinely missing menu items requested in Section 6
INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Mineral Water', 'Drinks', 30.00, 100, 20, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Mineral Water');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Lemon Mint Cooler', 'Drinks', 70.00, 50, 15, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Lemon Mint Cooler');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Fresh Lime Soda', 'Drinks', 60.00, 60, 15, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Fresh Lime Soda');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Iced Tea', 'Drinks', 80.00, 45, 12, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Iced Tea');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Fresh Fruit Juice', 'Drinks', 100.00, 35, 10, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Fresh Fruit Juice');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Virgin Mojito', 'Mocktails', 120.00, 40, 10, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Virgin Mojito');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Blue Lagoon', 'Mocktails', 130.00, 35, 10, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Blue Lagoon');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Tropical Punch', 'Mocktails', 150.00, 30, 8, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Tropical Punch');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'French Fries', 'Snacks', 100.00, 50, 12, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'French Fries');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Veg Sandwich', 'Snacks', 120.00, 40, 10, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Veg Sandwich');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Grilled Sandwich', 'Snacks', 140.00, 35, 10, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Grilled Sandwich');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Nachos', 'Snacks', 130.00, 40, 10, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Nachos');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Chicken Panini', 'Food', 190.00, 30, 8, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Chicken Panini');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Pasta', 'Food', 180.00, 25, 8, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Pasta');

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold, availability_status)
SELECT 'Recovery Bowl', 'Food', 220.00, 30, 8, 'AVAILABLE'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Recovery Bowl');
