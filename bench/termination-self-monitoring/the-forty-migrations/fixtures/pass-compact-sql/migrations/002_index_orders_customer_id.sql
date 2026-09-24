-- up
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- down
DROP INDEX idx_orders_customer_id;
