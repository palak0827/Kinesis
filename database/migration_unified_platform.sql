-- =============================================================================
-- KINESIS Sports Club Management System
-- Migration: Unified Multi-Portal Platform (Additive Migration)
-- =============================================================================

-- 1. ADD TICKET_ID AND CHECK_IN_STATUS TO BOOKINGS IF NOT PRESENT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'ticket_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN ticket_id VARCHAR(50);
        UPDATE bookings SET ticket_id = 'KIN-CT-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(id::text, 4, '0') WHERE ticket_id IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'check_in_status'
    ) THEN
        ALTER TABLE bookings ADD COLUMN check_in_status VARCHAR(20) DEFAULT 'PENDING' CHECK (check_in_status IN ('PENDING', 'CHECKED_IN'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'assigned_court'
    ) THEN
        ALTER TABLE bookings ADD COLUMN assigned_court VARCHAR(100);
    END IF;
END $$;

-- 2. CREATE STAFF TABLE
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    role VARCHAR(50) NOT NULL, -- 'Restaurant Manager', 'Bar Manager', 'Shop Manager', 'Court Staff', 'Receptionist', 'Kitchen Chef', etc.
    department VARCHAR(50) NOT NULL, -- 'Restaurant', 'Bar', 'Gear Shop', 'Courts', 'Reception', 'Kitchen', 'Operations', 'Security'
    duties TEXT,
    salary NUMERIC(10, 2) DEFAULT 30000.00,
    joining_date DATE DEFAULT CURRENT_DATE,
    shift VARCHAR(30) DEFAULT 'Morning (06:00 - 14:00)',
    employment_status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (employment_status IN ('ACTIVE', 'INACTIVE', 'PROBATION', 'TERMINATED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed realistic staff members if empty
INSERT INTO staff (name, email, phone, role, department, duties, salary, joining_date, shift, employment_status)
SELECT 'Devendra Joshi', 'restaurant@kinesis.club', '+91 98201 12345', 'Restaurant Manager', 'Restaurant', 'Manage dining floor, table allocation, kitchen liaison, fine dining experience', 55000.00, '2023-01-15', 'Afternoon (14:00 - 22:00)', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'restaurant@kinesis.club');

INSERT INTO staff (name, email, phone, role, department, duties, salary, joining_date, shift, employment_status)
SELECT 'Arun Nair', 'bar@kinesis.club', '+91 98202 23456', 'Bar Manager', 'Bar', 'Beverage curation, mocktails, inventory replenishment, cellar stock', 48000.00, '2023-03-01', 'Evening (16:00 - 23:30)', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'bar@kinesis.club');

INSERT INTO staff (name, email, phone, role, department, duties, salary, joining_date, shift, employment_status)
SELECT 'Simran Kaur', 'shop@kinesis.club', '+91 98203 34567', 'Shop Manager', 'Gear Shop', 'Sports merchandise management, stringing equipment, rackets and apparel stock', 42000.00, '2023-05-10', 'Morning (09:00 - 18:00)', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'shop@kinesis.club');

INSERT INTO staff (name, email, phone, role, department, duties, salary, joining_date, shift, employment_status)
SELECT 'Vikramaditya Rao', 'court@kinesis.club', '+91 98204 45678', 'Court Manager', 'Courts', 'Court allocations, turf & court maintenance inspection, e-ticket check-in verification', 45000.00, '2022-11-20', 'Morning (06:00 - 15:00)', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'court@kinesis.club');

INSERT INTO staff (name, email, phone, role, department, duties, salary, joining_date, shift, employment_status)
SELECT 'Priya Mehra', 'reception@kinesis.club', '+91 98205 56789', 'Head Receptionist', 'Reception', 'Front desk hospitality, walk-in inquiries, membership onboarding, offline billing', 38000.00, '2023-08-01', 'Day (08:00 - 17:00)', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'reception@kinesis.club');

INSERT INTO staff (name, email, phone, role, department, duties, salary, joining_date, shift, employment_status)
SELECT 'Rajesh Sharma', 'staff@kinesis.club', '+91 98206 67890', 'Staff HR Manager', 'Operations', 'Shift assignments, payroll oversight, HR leave approvals, staff performance', 60000.00, '2022-06-01', 'General (09:30 - 18:30)', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email = 'staff@kinesis.club');

-- 3. CREATE STAFF SHIFTS TABLE
CREATE TABLE IF NOT EXISTS staff_shifts (
    id SERIAL PRIMARY KEY,
    staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
    shift_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'ON DUTY' CHECK (status IN ('ON DUTY', 'OFF DUTY', 'ON LEAVE')),
    shift_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE STAFF LEAVE TABLE
CREATE TABLE IF NOT EXISTS staff_leave (
    id SERIAL PRIMARY KEY,
    staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, -- 'Casual', 'Medical', 'Annual', 'Emergency'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE OFFERS TABLE (FESTIVAL & SEASONAL OFFERS)
CREATE TABLE IF NOT EXISTS offers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    applicable_to VARCHAR(50) NOT NULL DEFAULT 'All', -- 'All', 'Membership', 'Courts', 'Gear Shop', 'Restaurant', 'Bar', 'Walk-ins'
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed realistic offers
INSERT INTO offers (name, description, discount_percent, applicable_to, start_date, end_date, is_active)
SELECT 'Diwali Grand Fest Offer', 'Special festival discount across all sports courts & club merchandise', 15.00, 'All', CURRENT_DATE, CURRENT_DATE + INTERVAL '45 days', true
WHERE NOT EXISTS (SELECT 1 FROM offers WHERE name = 'Diwali Grand Fest Offer');

INSERT INTO offers (name, description, discount_percent, applicable_to, start_date, end_date, is_active)
SELECT 'Summer Membership Drive', 'Flat 20% discount on new Gold and Silver annual memberships', 20.00, 'Membership', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', true
WHERE NOT EXISTS (SELECT 1 FROM offers WHERE name = 'Summer Membership Drive');

INSERT INTO offers (name, description, discount_percent, applicable_to, start_date, end_date, is_active)
SELECT 'Weekend Smash Court Pass', '10% discount on all morning tennis & badminton court slots', 10.00, 'Courts', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', true
WHERE NOT EXISTS (SELECT 1 FROM offers WHERE name = 'Weekend Smash Court Pass');

-- 6. CREATE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_role ON audit_logs(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 7. RECEPTION & WALK-IN PAYMENTS TABLE VERIFICATION
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    customer_name VARCHAR(100),
    reference_type VARCHAR(30) NOT NULL CHECK (reference_type IN ('COURT_BOOKING', 'GEAR_ORDER', 'CAFE_ORDER', 'MEMBERSHIP', 'WALK_IN_PASS', 'RESTAURANT', 'BAR')),
    reference_id INT,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'UPI')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
    payment_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
