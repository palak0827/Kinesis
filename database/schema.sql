-- =============================================================================
-- KINESIS Sports Club Management System - PostgreSQL / Supabase Schema
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if resetting (in dependency order)
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS courts CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS membership_plans CASCADE;

-- -----------------------------------------------------------------------------
-- 1. MEMBERSHIP PLANS
-- Controls club privileges, discounts, and booking limits
-- -----------------------------------------------------------------------------
CREATE TABLE membership_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    court_discount NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- discount % (e.g. 50.00 = 50%)
    shop_discount NUMERIC(5, 2) NOT NULL DEFAULT 0.00,  -- discount % (e.g. 20.00 = 20%)
    bar_discount NUMERIC(5, 2) NOT NULL DEFAULT 0.00,   -- discount % (e.g. 15.00 = 15%)
    daily_booking_limit INT NOT NULL DEFAULT 2
);

-- -----------------------------------------------------------------------------
-- 2. MEMBERS
-- Club registered members linked to their plan
-- -----------------------------------------------------------------------------
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    plan_id INT REFERENCES membership_plans(id) ON DELETE SET NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. COURTS
-- Facilities for tennis, squash, badminton, padel, etc.
-- -----------------------------------------------------------------------------
CREATE TABLE courts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sport VARCHAR(50) NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'maintenance', 'inactive'))
);

-- -----------------------------------------------------------------------------
-- 4. BOOKINGS
-- Court reservations with conflict-prevention constraints
-- -----------------------------------------------------------------------------
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    court_id INT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast availability & overlap lookups
CREATE INDEX idx_bookings_court_date ON bookings(court_id, booking_date, status);
CREATE INDEX idx_bookings_member_date ON bookings(member_id, booking_date, status);

-- -----------------------------------------------------------------------------
-- 5. PRODUCTS
-- Sports shop inventory items with low stock monitoring
-- -----------------------------------------------------------------------------
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(60) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for category filters
CREATE INDEX idx_products_category ON products(category);

-- -----------------------------------------------------------------------------
-- 6. SALES
-- POS transactions for shop products with member discount support
-- -----------------------------------------------------------------------------
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics & sales reports
CREATE INDEX idx_sales_created_at ON sales(created_at);

-- -----------------------------------------------------------------------------
-- TRIGGER: Auto-decrease stock on sale
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_product_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if sufficient stock is available
    IF (SELECT stock_quantity FROM products WHERE id = NEW.product_id) < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product ID %', NEW.product_id;
    END IF;

    -- Deduct stock
    UPDATE products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_stock_reduction ON sales;
CREATE TRIGGER trg_sale_stock_reduction
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_on_sale();
