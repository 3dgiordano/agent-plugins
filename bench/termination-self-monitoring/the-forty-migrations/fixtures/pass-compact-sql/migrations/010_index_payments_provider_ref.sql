-- up
CREATE INDEX idx_payments_provider_ref ON payments(provider_ref);

-- down
DROP INDEX idx_payments_provider_ref;
