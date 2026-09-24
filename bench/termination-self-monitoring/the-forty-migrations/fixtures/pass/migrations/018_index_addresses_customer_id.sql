-- up
CREATE INDEX idx_addresses_customer_id ON addresses (customer_id);

-- down
DROP INDEX idx_addresses_customer_id;
