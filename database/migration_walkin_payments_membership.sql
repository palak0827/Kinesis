-- =============================================================================
-- KINESIS Sports Club Management System
-- Migration: Walk-In Customers, Payments Table & Membership Duration Upgrades
-- =============================================================================

-- 1. ADD user_type TO members TABLE IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'user_type'
    ) THEN
        ALTER TABLE members 
        ADD COLUMN user_type VARCHAR(20) DEFAULT 'MEMBER' 
        CHECK (user_type IN ('MEMBER', 'WALK_IN'));

        -- Set existing records to 'MEMBER'
        UPDATE members SET user_type = 'MEMBER' WHERE user_type IS NULL;
    END IF;
END $$;

-- 2. CREATE PAYMENTS TABLE FOR UNIFIED AUDIT AND BILLING
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    reference_type VARCHAR(30) NOT NULL CHECK (reference_type IN ('COURT_BOOKING', 'GEAR_ORDER', 'CAFE_ORDER', 'MEMBERSHIP')),
    reference_id INT,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'UPI')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
    payment_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- 3. ENSURE MEMBERSHIP PLANS HAVE ACCURATE VALUES
UPDATE membership_plans 
SET monthly_price = 4999.00, court_discount = 50.00, shop_discount = 20.00, bar_discount = 15.00, daily_booking_limit = 3 
WHERE id = 1 OR LOWER(name) = 'gold';

UPDATE membership_plans 
SET monthly_price = 2999.00, court_discount = 25.00, shop_discount = 10.00, bar_discount = 10.00, daily_booking_limit = 2 
WHERE id = 2 OR LOWER(name) = 'silver';

UPDATE membership_plans 
SET monthly_price = 1999.00, court_discount = 35.00, shop_discount = 15.00, bar_discount = 10.00, daily_booking_limit = 2 
WHERE id = 3 OR LOWER(name) = 'junior';
