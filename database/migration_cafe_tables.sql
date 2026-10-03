-- =============================================================================
-- KINESIS Sports Club Management System
-- Migration: Physical Café & Bar Table Management
-- =============================================================================

CREATE TABLE IF NOT EXISTS cafe_tables (
    id SERIAL PRIMARY KEY,
    table_number VARCHAR(20) NOT NULL UNIQUE,
    table_name VARCHAR(100),
    capacity INTEGER NOT NULL DEFAULT 2 CHECK (capacity > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (
            status IN (
                'AVAILABLE',
                'RESERVED',
                'OCCUPIED',
                'UNDER_MAINTENANCE'
            )
        ),
    reserved_by VARCHAR(100),
    reservation_date DATE,
    reservation_time VARCHAR(50),
    party_size INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for status filtering and operations
CREATE INDEX IF NOT EXISTS idx_cafe_tables_status ON cafe_tables(status);

-- Enable RLS
ALTER TABLE cafe_tables ENABLE ROW LEVEL SECURITY;

-- Development policies
DROP POLICY IF EXISTS "Allow select for all on cafe_tables" ON cafe_tables;
CREATE POLICY "Allow select for all on cafe_tables" ON cafe_tables FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for all on cafe_tables" ON cafe_tables;
CREATE POLICY "Allow insert for all on cafe_tables" ON cafe_tables FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for all on cafe_tables" ON cafe_tables;
CREATE POLICY "Allow update for all on cafe_tables" ON cafe_tables FOR UPDATE USING (true);

-- Initial realistic seed data for physical tables
INSERT INTO cafe_tables (table_number, table_name, capacity, status, reserved_by, reservation_date, reservation_time, party_size, notes)
VALUES
    ('Table 01', 'Courtyard Patio Bistro', 2, 'AVAILABLE', NULL, NULL, NULL, NULL, 'Near the outdoor garden fountain'),
    ('Table 02', 'Courtyard Patio Bistro', 2, 'AVAILABLE', NULL, NULL, NULL, NULL, 'Shaded umbrella seating'),
    ('Table 03', 'Grand Lounge Center', 4, 'OCCUPIED', NULL, NULL, NULL, NULL, 'Active dining party'),
    ('Table 04', 'Grand Lounge Center', 4, 'AVAILABLE', NULL, NULL, NULL, NULL, 'Prime view of central tennis courts'),
    ('Table 05', 'Clubhouse Window Booth', 4, 'RESERVED', 'Alex Mercer (Gold Member)', CURRENT_DATE, '07:30 PM', 4, 'VIP Anniversary celebration'),
    ('Table 06', 'Clubhouse Window Booth', 4, 'AVAILABLE', NULL, NULL, NULL, NULL, 'Comfortable cushioned booth'),
    ('Table 07', 'Executive Dining Alcove', 6, 'AVAILABLE', NULL, NULL, NULL, NULL, 'Semi-private glass partition'),
    ('Table 08', 'Executive Dining Alcove', 6, 'UNDER_MAINTENANCE', NULL, NULL, NULL, NULL, 'Wood varnish refurbishing in progress'),
    ('Table 09', 'Champions Banquet Round', 8, 'RESERVED', 'Rohan Sharma', CURRENT_DATE, '08:00 PM', 8, 'Post-tournament team dinner'),
    ('Table 10', 'Champions Banquet Round', 8, 'AVAILABLE', NULL, NULL, NULL, NULL, 'Spacious round table for large squads')
ON CONFLICT (table_number) DO NOTHING;
