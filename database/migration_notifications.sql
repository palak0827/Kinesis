-- =============================================================================
-- KINESIS Sports Club Management System
-- Migration: Global Notifications System & Staff Authentication
-- =============================================================================

-- 1. ADD PASSWORD TO STAFF TABLE IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'password'
    ) THEN
        ALTER TABLE staff ADD COLUMN password VARCHAR(100) DEFAULT 'StaffPassword123!';
    END IF;
END $$;

-- 2. CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_type VARCHAR(20) NOT NULL, -- 'MEMBER', 'STAFF', 'ROLE', 'ALL'
    recipient_id VARCHAR(50),            -- member ID or staff ID (or null for role broadcast)
    role VARCHAR(50),                    -- 'MEMBER', 'ADMIN', 'COURT_MANAGER', 'RESTAURANT_MANAGER', 'BAR_MANAGER', 'SHOP_MANAGER', 'STAFF_MANAGER', 'RECEPTION'
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'INFO', -- 'INFO', 'SUCCESS', 'WARNING', 'ERROR', 'BOOKING', 'ORDER', 'PAYMENT', 'MEMBERSHIP', 'INVENTORY', 'STAFF', 'SYSTEM', 'OFFER', 'MAINTENANCE'
    reference_id VARCHAR(50),
    reference_type VARCHAR(50),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Useful indexes for instant lookups
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Seed initial system notifications for demo if empty
INSERT INTO notifications (recipient_type, recipient_id, role, title, message, type, is_read, created_at)
SELECT 'ALL', NULL, 'MEMBER', 'Welcome to Kinesis Sports Club', 'Explore championship courts, pro gear shop, and artisan dining lounge.', 'SYSTEM', false, NOW() - INTERVAL '2 hours'
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE title = 'Welcome to Kinesis Sports Club');

INSERT INTO notifications (recipient_type, recipient_id, role, title, message, type, is_read, created_at)
SELECT 'ROLE', NULL, 'ADMIN', 'Global Notification System Active', 'All 8 club operational portals connected with role-based alerts.', 'SYSTEM', false, NOW() - INTERVAL '1 hour'
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE title = 'Global Notification System Active');
