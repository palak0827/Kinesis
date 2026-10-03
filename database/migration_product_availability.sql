-- =============================================================================
-- KINESIS Sports Club Management System
-- Migration: Product Availability Status Column
-- Adds availability_status with default 'AVAILABLE' to products table
-- =============================================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS availability_status VARCHAR(30) DEFAULT 'AVAILABLE'
CHECK (availability_status IN ('AVAILABLE', 'OUT_OF_STOCK', 'TEMPORARILY_UNAVAILABLE'));

-- Update existing records to AVAILABLE if null
UPDATE products 
SET availability_status = 'AVAILABLE' 
WHERE availability_status IS NULL;

-- Automatically mark items with 0 stock as OUT_OF_STOCK
UPDATE products 
SET availability_status = 'OUT_OF_STOCK' 
WHERE stock_quantity = 0;

CREATE INDEX IF NOT EXISTS idx_products_availability ON products(availability_status);
