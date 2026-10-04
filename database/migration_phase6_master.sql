-- =============================================================================
-- KINESIS Sports Club Management System
-- PHASE 6 MASTER MIGRATION
-- Run this in your Supabase SQL Editor to apply all Phase 6 schema changes.
-- All statements are idempotent (safe to run multiple times).
-- =============================================================================

-- -------------------------------------------------------------------------
-- 1. MEMBERS TABLE: Add missing columns (club_id, password, user_type)
-- -------------------------------------------------------------------------
DO $$
BEGIN
    -- club_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members' AND column_name = 'club_id') THEN
        ALTER TABLE members ADD COLUMN club_id VARCHAR(10);
    END IF;

    -- password column (plain-text for demo; hash in production)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members' AND column_name = 'password') THEN
        ALTER TABLE members ADD COLUMN password VARCHAR(255) DEFAULT 'MemberPassword123!';
    END IF;

    -- user_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members' AND column_name = 'user_type') THEN
        ALTER TABLE members ADD COLUMN user_type VARCHAR(20) DEFAULT 'MEMBER'
            CHECK (user_type IN ('MEMBER', 'WALK_IN'));
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 2. Generate & backfill club_id for existing rows
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_club_id() RETURNS VARCHAR AS $$
DECLARE
    new_id VARCHAR(10);
    done BOOLEAN := FALSE;
BEGIN
    WHILE NOT done LOOP
        new_id := (1000000000 + FLOOR(RANDOM() * 9000000000))::TEXT;
        IF NOT EXISTS (SELECT 1 FROM members WHERE club_id = new_id) THEN
            done := TRUE;
        END IF;
    END LOOP;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT id FROM members WHERE club_id IS NULL LOOP
        UPDATE members SET club_id = generate_club_id() WHERE id = r.id;
    END LOOP;
END $$;

-- Add NOT NULL + UNIQUE after backfill
DO $$
BEGIN
    -- Add UNIQUE constraint if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'members'
          AND tc.constraint_type = 'UNIQUE'
          AND ccu.column_name = 'club_id'
    ) THEN
        ALTER TABLE members ADD CONSTRAINT members_club_id_key UNIQUE (club_id);
    END IF;
END $$;

-- Auto-assign club_id trigger
CREATE OR REPLACE FUNCTION trg_set_club_id_fn() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.club_id IS NULL THEN
        NEW.club_id := generate_club_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_club_id ON members;
CREATE TRIGGER trg_set_club_id
BEFORE INSERT ON members
FOR EACH ROW
EXECUTE FUNCTION trg_set_club_id_fn();

-- -------------------------------------------------------------------------
-- 3. BOOKINGS: Add payment columns if missing
-- -------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'payment_method') THEN
        ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(20) DEFAULT 'UPI'
            CHECK (payment_method IN ('CASH', 'CARD', 'UPI'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
        ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) DEFAULT 'PAID'
            CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'ticket_id') THEN
        ALTER TABLE bookings ADD COLUMN ticket_id VARCHAR(50);
        UPDATE bookings SET ticket_id = 'KIN-CT-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(id::text, 4, '0') WHERE ticket_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'check_in_status') THEN
        ALTER TABLE bookings ADD COLUMN check_in_status VARCHAR(20) DEFAULT 'PENDING'
            CHECK (check_in_status IN ('PENDING', 'CHECKED_IN'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'assigned_court') THEN
        ALTER TABLE bookings ADD COLUMN assigned_court VARCHAR(100);
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 4. SALES: Add department isolation column
-- -------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales' AND column_name = 'department') THEN
        ALTER TABLE sales ADD COLUMN department VARCHAR(30) DEFAULT 'GEAR_SHOP'
            CHECK (department IN ('GEAR_SHOP', 'CAFE', 'BAR', 'RESTAURANT'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales' AND column_name = 'payment_method') THEN
        ALTER TABLE sales ADD COLUMN payment_method VARCHAR(20) DEFAULT 'CARD'
            CHECK (payment_method IN ('CASH', 'CARD', 'UPI'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales' AND column_name = 'payment_status') THEN
        ALTER TABLE sales ADD COLUMN payment_status VARCHAR(20) DEFAULT 'PAID'
            CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED'));
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 5. CAFE ORDERS: Ensure payment_method and department columns exist
-- -------------------------------------------------------------------------
DO $$
BEGIN
    -- cafe_orders table (may not exist yet; handled by cafe migration)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cafe_orders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'cafe_orders' AND column_name = 'payment_method') THEN
            ALTER TABLE cafe_orders ADD COLUMN payment_method VARCHAR(20) DEFAULT 'CARD'
                CHECK (payment_method IN ('CASH', 'CARD', 'UPI'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'cafe_orders' AND column_name = 'payment_status') THEN
            ALTER TABLE cafe_orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'PAID'
                CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'cafe_orders' AND column_name = 'department') THEN
            ALTER TABLE cafe_orders ADD COLUMN department VARCHAR(30) DEFAULT 'CAFE'
                CHECK (department IN ('CAFE', 'BAR', 'RESTAURANT'));
        END IF;
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 6. PAYMENTS TABLE: Ensure cash-pending workflow support
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    customer_name VARCHAR(100),
    reference_type VARCHAR(30) NOT NULL,
    reference_id INT,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'CARD',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID',
    payment_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 7. INDEXES for performance
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_members_club_id ON members(club_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);