-- up
ALTER TABLE coupons ADD COLUMN expires_at TIMESTAMP NULL;

-- down
ALTER TABLE coupons DROP COLUMN expires_at;
