-- =============================================================================
-- KINESIS Sports Club Management System
-- Migration: Add 10-Digit Unique Club ID
-- =============================================================================

-- 1. ADD club_id COLUMN
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'club_id'
    ) THEN
        ALTER TABLE members ADD COLUMN club_id VARCHAR(10) UNIQUE;
    END IF;
END $$;

-- 2. CREATE FUNCTION TO GENERATE 10-DIGIT RANDOM UNIQUE ID
CREATE OR REPLACE FUNCTION generate_club_id() RETURNS VARCHAR AS $$
DECLARE
    new_id VARCHAR(10);
    done BOOLEAN := FALSE;
BEGIN
    WHILE NOT done LOOP
        -- Generate a number between 1000000000 and 9999999999
        new_id := (1000000000 + FLOOR(RANDOM() * 9000000000))::TEXT;
        IF NOT EXISTS (SELECT 1 FROM members WHERE club_id = new_id) THEN
            done := TRUE;
        END IF;
    END LOOP;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 3. SET CLUB ID FOR EXISTING ROWS
DO $$
DECLARE
    row RECORD;
BEGIN
    FOR row IN SELECT id FROM members WHERE club_id IS NULL LOOP
        UPDATE members SET club_id = generate_club_id() WHERE id = row.id;
    END LOOP;
END $$;

-- 4. MAKE club_id NOT NULL
ALTER TABLE members ALTER COLUMN club_id SET NOT NULL;

-- 5. CREATE TRIGGER TO AUTO-ASSIGN club_id ON INSERT
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
