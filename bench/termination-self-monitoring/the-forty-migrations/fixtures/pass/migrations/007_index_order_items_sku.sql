-- up
CREATE INDEX idx_order_items_sku ON order_items (sku);

-- down
DROP INDEX idx_order_items_sku;
