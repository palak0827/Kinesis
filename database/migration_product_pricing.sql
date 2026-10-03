-- ==============================================================================
-- Kinesis Sports Club Management System
-- Migration: Affordable Prototype Product Pricing (Gear Shop & Café & Bar)
-- File: database/migration_product_pricing.sql
-- ==============================================================================

-- 1. GEAR SHOP PRODUCTS REPRICING (Target Range ₹100 - ₹500)
-- Basic / Local:    ₹100 - ₹199
-- Standard:         ₹200 - ₹299
-- Premium:          ₹300 - ₹399
-- Luxury / Pro:     ₹400 - ₹500

UPDATE products SET price = 499.00, category = 'Rackets'     WHERE id = 1  OR LOWER(name) = LOWER('Wilson Pro Staff 97 v14');
UPDATE products SET price = 449.00, category = 'Rackets'     WHERE id = 2  OR LOWER(name) = LOWER('Head Speed MP 2024');
UPDATE products SET price = 249.00, category = 'Balls'       WHERE id = 3  OR LOWER(name) = LOWER('Babolat Team All Court (4-Can)');
UPDATE products SET price = 199.00, category = 'Balls'       WHERE id = 4  OR LOWER(name) = LOWER('Dunlop Pro Squash Balls (3-Pack)');
UPDATE products SET price = 249.00, category = 'Accessories' WHERE id = 5  OR LOWER(name) = LOWER('Yonex Mavis 350 Shuttlecocks (6-Tube)');
UPDATE products SET price = 499.00, category = 'Rackets'     WHERE id = 6  OR LOWER(name) = LOWER('Bullpadel Hack 03 Padel Racket');
UPDATE products SET price = 449.00, category = 'Apparel'     WHERE id = 7  OR LOWER(name) = LOWER('Kinesis Pro Club Tech Polo');
UPDATE products SET price = 199.00, category = 'Accessories' WHERE id = 8  OR LOWER(name) = LOWER('Kinesis Microfibre Quick-Dry Towel');

-- 2. CAFÉ & BAR - DRINKS & REHYDRATION (Sensible Pricing ₹40 - ₹199)
UPDATE products SET price = 99.00,  category = 'Drinks' WHERE id = 9  OR LOWER(name) LIKE '%hydrofuel%';
UPDATE products SET price = 149.00, category = 'Drinks' WHERE id = 11 OR LOWER(name) LIKE '%artisan roast%';
UPDATE products SET price = 109.00, category = 'Drinks' WHERE id = 14 OR (LOWER(name) = 'iced tea' AND LOWER(category) = 'drinks');
UPDATE products SET price = 129.00, category = 'Drinks' WHERE id = 15 OR (LOWER(name) = 'cold coffee' AND LOWER(category) = 'drinks');
UPDATE products SET price = 149.00, category = 'Drinks' WHERE id = 16 OR (LOWER(name) = 'cold brew' AND LOWER(category) = 'drinks');
UPDATE products SET price = 199.00, category = 'Drinks' WHERE id = 17 OR (LOWER(name) = 'protein shake' AND LOWER(category) = 'drinks');
UPDATE products SET price = 129.00, category = 'Drinks' WHERE id = 18 OR (LOWER(name) = 'fresh fruit juice' AND LOWER(category) = 'drinks');
UPDATE products SET price = 99.00,  category = 'Drinks' WHERE id = 19 OR (LOWER(name) = 'electrolyte drink' AND LOWER(category) = 'drinks');

-- 3. CAFÉ & BAR - MOCKTAILS (Sensible Pricing ₹149 - ₹179)
UPDATE products SET price = 149.00, category = 'Mocktails' WHERE id = 20 OR LOWER(name) = 'virgin mojito';
UPDATE products SET price = 159.00, category = 'Mocktails' WHERE id = 21 OR LOWER(name) = 'blue lagoon';
UPDATE products SET price = 169.00, category = 'Mocktails' WHERE id = 22 OR LOWER(name) = 'berry fizz';
UPDATE products SET price = 179.00, category = 'Mocktails' WHERE id = 23 OR LOWER(name) = 'tropical punch';
UPDATE products SET price = 149.00, category = 'Mocktails' WHERE id = 24 OR LOWER(name) = 'watermelon cooler';

-- 4. CAFÉ & BAR - SNACKS & FOOD (Sensible Pricing ₹119 - ₹279)
UPDATE products SET price = 119.00, category = 'Snacks' WHERE id = 10 OR LOWER(name) LIKE '%purewhey high protein%';
UPDATE products SET price = 249.00, category = 'Food'   WHERE id = 12 OR LOWER(name) LIKE '%sourdough chicken panini%';
UPDATE products SET price = 279.00, category = 'Food'   WHERE id = 13 OR LOWER(name) LIKE '%acai energy%';
UPDATE products SET price = 129.00, category = 'Snacks' WHERE id = 25 OR LOWER(name) = 'french fries';
UPDATE products SET price = 149.00, category = 'Snacks' WHERE id = 26 OR LOWER(name) = 'veg sandwich';
UPDATE products SET price = 179.00, category = 'Snacks' WHERE id = 27 OR LOWER(name) = 'grilled sandwich';
UPDATE products SET price = 119.00, category = 'Snacks' WHERE id = 28 OR (LOWER(name) = 'protein bar' AND LOWER(category) = 'snacks');
UPDATE products SET price = 169.00, category = 'Snacks' WHERE id = 29 OR LOWER(name) = 'nachos';
UPDATE products SET price = 199.00, category = 'Food'   WHERE id = 30 OR LOWER(name) = 'veg panini';
UPDATE products SET price = 249.00, category = 'Food'   WHERE id = 31 OR LOWER(name) = 'chicken panini';
UPDATE products SET price = 219.00, category = 'Food'   WHERE id = 32 OR LOWER(name) = 'paneer wrap';
UPDATE products SET price = 249.00, category = 'Food'   WHERE id = 33 OR LOWER(name) = 'chicken wrap';
UPDATE products SET price = 229.00, category = 'Food'   WHERE id = 34 OR LOWER(name) = 'pasta';
UPDATE products SET price = 249.00, category = 'Food'   WHERE id = 35 OR LOWER(name) = 'healthy bowl';
UPDATE products SET price = 279.00, category = 'Food'   WHERE id = 36 OR LOWER(name) = 'recovery bowl';

-- 5. SAFELY INSERT MISSING MENU & GEAR ITEMS IF NOT ALREADY PRESENT
INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold)
SELECT 'Mineral Water', 'Drinks', 40.00, 60, 15
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(name) = LOWER('Mineral Water'));

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold)
SELECT 'Fresh Lime Soda', 'Drinks', 89.00, 40, 10
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(name) = LOWER('Fresh Lime Soda'));

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold)
SELECT 'Lemon Mint Cooler', 'Drinks', 99.00, 35, 10
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(name) = LOWER('Lemon Mint Cooler'));

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold)
SELECT 'Gray-Nicolls Powerbow Cricket Bat', 'Rackets', 499.00, 6, 2
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(name) = LOWER('Gray-Nicolls Powerbow Cricket Bat'));

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold)
SELECT 'SG Test Cricket Leather Ball', 'Balls', 349.00, 20, 6
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(name) = LOWER('SG Test Cricket Leather Ball'));

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold)
SELECT 'Yonex Astrox 88D Pro Badminton Racket', 'Rackets', 449.00, 8, 2
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(name) = LOWER('Yonex Astrox 88D Pro Badminton Racket'));

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold)
SELECT 'Kinesis Pro Performance T-Shirt', 'Apparel', 299.00, 20, 6
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(name) = LOWER('Kinesis Pro Performance T-Shirt'));

INSERT INTO products (name, category, price, stock_quantity, low_stock_threshold)
SELECT 'Kinesis Tour Club Sports Bag', 'Accessories', 399.00, 12, 4
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(name) = LOWER('Kinesis Tour Club Sports Bag'));
