-- =============================================================================
-- Kinesis Sports Club: Kitchen Order Priority Migration
-- Adds priority column to cafe_orders table
-- =============================================================================

ALTER TABLE cafe_orders 
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'NORMAL'
CHECK (priority IN ('NORMAL', 'URGENT'));

CREATE INDEX IF NOT EXISTS idx_cafe_orders_priority ON cafe_orders(priority);
