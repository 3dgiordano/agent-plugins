-- up
CREATE INDEX idx_shipments_order_id ON shipments (order_id);

-- down
DROP INDEX idx_shipments_order_id;
