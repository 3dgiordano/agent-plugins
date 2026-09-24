-- up
CREATE INDEX idx_carts_customer_id ON carts (customer_id);

-- down
DROP INDEX idx_carts_customer_id;
