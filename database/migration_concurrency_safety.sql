-- ==============================================================================
-- Kinesis Sports Club Management System
-- Migration: Database-Safe Concurrency & First-Come-First-Served (FCFS) Safety
-- File: database/migration_concurrency_safety.sql
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. COURT BOOKING CONCURRENCY PROTECTION
-- Guarantee: Exactly ONE confirmed booking can exist for a given court, date,
-- and start time. Physically blocks race conditions at the database engine level.
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_court_slot
ON bookings (court_id, booking_date, start_time)
WHERE status = 'confirmed';

-- Transactional Court Booking Function with Advisory Locking
-- Prevents overlapping bookings across multi-slot intervals (30, 60, 90, 120 mins)
CREATE OR REPLACE FUNCTION concurrency_safe_book_court(
    p_member_id INT,
    p_court_id INT,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_price NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_conflict_count INT;
    v_new_id INT;
BEGIN
    -- Acquire transaction-level advisory lock on (court_id, booking_date)
    -- This serializes concurrent booking attempts for the same facility on the same day.
    PERFORM pg_advisory_xact_lock(hashtext(p_court_id::text || '_' || p_booking_date::text));

    -- Overlap rule: newStart < existingEnd AND newEnd > existingStart
    SELECT COUNT(*) INTO v_conflict_count
    FROM bookings
    WHERE court_id = p_court_id
      AND booking_date = p_booking_date
      AND status != 'cancelled'
      AND p_start_time < end_time
      AND p_end_time > start_time;

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'SLOT_ALREADY_BOOKED',
            'message', 'This time slot was just booked by another customer. Please choose another slot.'
        );
    END IF;

    -- Insert confirmed booking
    INSERT INTO bookings (member_id, court_id, booking_date, start_time, end_time, price, status)
    VALUES (p_member_id, p_court_id, p_booking_date, p_start_time, p_end_time, p_price, 'confirmed')
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_new_id
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'SLOT_ALREADY_BOOKED',
            'message', 'This time slot was just booked by another customer. Please choose another slot.'
        );
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 2. ENHANCE SALES TRIGGER WITH ROW-LEVEL LOCKING (FOR UPDATE)
-- Serializes concurrent sales insertions on the same product row, ensuring
-- no overselling or negative stock can ever occur.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_product_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock INT;
    v_name VARCHAR(120);
BEGIN
    -- Lock product row FOR UPDATE to serialize concurrent sales
    SELECT stock_quantity, name INTO v_current_stock, v_name
    FROM products
    WHERE id = NEW.product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Product with ID % does not exist', NEW.product_id;
    END IF;

    IF v_current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: Sorry, "%" was just purchased by another customer and is now out of stock (available: %, requested: %)',
            v_name, v_current_stock, NEW.quantity;
    END IF;

    -- Deduct stock safely
    UPDATE products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. ATOMIC MULTI-ITEM CHECKOUT FUNCTION (GEAR SHOP & CAFÉ & BAR)
-- Core Business Rule:
-- Membership determines pricing and benefits. It does NOT determine resource priority.
-- Limited resources are allocated first-come-first-served (FCFS) according to the
-- first valid database transaction that successfully acquires the resource.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION concurrency_safe_checkout(
    p_member_id INT,
    p_items JSONB,              -- Array of { "productId": 1, "quantity": 2, "unitPrice": 149.00 }
    p_priority TEXT DEFAULT 'NORMAL',
    p_order_type TEXT DEFAULT 'CAFE_ORDER',
    p_bar_discount_percent NUMERIC DEFAULT 0.00
) RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
    v_current_stock INT;
    v_product_name VARCHAR(120);
    v_product_price NUMERIC;
    v_subtotal NUMERIC := 0.00;
    v_discount_amount NUMERIC := 0.00;
    v_final_total NUMERIC := 0.00;
    v_order_id INT := NULL;
    v_line_total NUMERIC;
    v_effective_unit_price NUMERIC;
    v_item_discount NUMERIC;
BEGIN
    -- 1. Validate items array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'EMPTY_CART',
            'message', 'Cart is empty. Please add items to place an order.'
        );
    END IF;

    -- 2. DEADLOCK PREVENTION: Lock all product rows in deterministic ascending ID order
    -- Using FOR UPDATE locks each product row so concurrent transactions wait in line.
    FOR v_item IN
        SELECT 
            (elem->>'productId')::INT AS product_id,
            (elem->>'quantity')::INT AS quantity,
            (elem->>'unitPrice')::NUMERIC AS unit_price
        FROM jsonb_array_elements(p_items) AS elem
        ORDER BY (elem->>'productId')::INT ASC
    LOOP
        SELECT stock_quantity, name, price INTO v_current_stock, v_product_name, v_product_price
        FROM products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF v_current_stock IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'PRODUCT_NOT_FOUND',
                'message', 'Product #' || v_item.product_id || ' was not found.'
            );
        END IF;

        -- Strict availability check: if ANY item has insufficient stock, FAIL ENTIRE TRANSACTION
        IF v_current_stock < v_item.quantity THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'INSUFFICIENT_STOCK',
                'product_id', v_item.product_id,
                'product_name', v_product_name,
                'message', 'Sorry, "' || v_product_name || '" was just purchased by another customer and is now out of stock.'
            );
        END IF;

        v_line_total := ROUND(v_product_price * v_item.quantity, 2);
        v_subtotal := v_subtotal + v_line_total;
    END LOOP;

    -- 3. Calculate discounts based on membership tier
    v_discount_amount := ROUND(v_subtotal * (COALESCE(p_bar_discount_percent, 0.00) / 100.00), 2);
    v_final_total := GREATEST(0.00, v_subtotal - v_discount_amount);

    -- 4. Create order header in cafe_orders
    INSERT INTO cafe_orders (member_id, subtotal, discount_amount, total, status, priority, created_at)
    VALUES (p_member_id, v_subtotal, v_discount_amount, v_final_total, 'NEW', COALESCE(p_priority, 'NORMAL'), NOW())
    RETURNING id INTO v_order_id;

    -- 5. Insert order line items and sales records
    -- Note: Because update_product_stock_on_sale() trigger runs on sales insert,
    -- inserting into sales automatically decrements stock_quantity safely!
    FOR v_item IN
        SELECT 
            (elem->>'productId')::INT AS product_id,
            (elem->>'quantity')::INT AS quantity
        FROM jsonb_array_elements(p_items) AS elem
        ORDER BY (elem->>'productId')::INT ASC
    LOOP
        SELECT price INTO v_product_price FROM products WHERE id = v_item.product_id;
        v_line_total := ROUND(v_product_price * v_item.quantity, 2);

        -- Insert cafe_order_items
        INSERT INTO cafe_order_items (order_id, product_id, quantity, unit_price, total)
        VALUES (v_order_id, v_item.product_id, v_item.quantity, v_product_price, v_line_total);

        -- Insert sales (triggers update_product_stock_on_sale to deduct stock atomically)
        v_item_discount := ROUND(v_product_price * (COALESCE(p_bar_discount_percent, 0.00) / 100.00), 2);
        v_effective_unit_price := GREATEST(0.00, v_product_price - v_item_discount);

        INSERT INTO sales (product_id, member_id, quantity, unit_price, total, created_at)
        VALUES (v_item.product_id, p_member_id, v_item.quantity, v_effective_unit_price, ROUND(v_effective_unit_price * v_item.quantity, 2), NOW());
    END LOOP;

    -- 6. Return successful atomic result
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'subtotal', v_subtotal,
        'discount_amount', v_discount_amount,
        'total', v_final_total
    );
END;
$$ LANGUAGE plpgsql;
