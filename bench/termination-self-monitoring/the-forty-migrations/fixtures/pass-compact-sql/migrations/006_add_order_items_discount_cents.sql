-- up
ALTER TABLE order_items ADD COLUMN discount_cents INTEGER NOT NULL DEFAULT 0;

-- down
ALTER TABLE order_items DROP COLUMN discount_cents;
