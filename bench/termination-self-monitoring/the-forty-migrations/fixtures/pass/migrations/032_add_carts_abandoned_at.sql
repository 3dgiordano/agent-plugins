-- up
ALTER TABLE carts ADD COLUMN abandoned_at TIMESTAMP NULL;

-- down
ALTER TABLE carts DROP COLUMN abandoned_at;
