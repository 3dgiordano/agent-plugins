-- up
CREATE INDEX idx_coupons_code ON coupons(code);

-- down
DROP INDEX idx_coupons_code;
