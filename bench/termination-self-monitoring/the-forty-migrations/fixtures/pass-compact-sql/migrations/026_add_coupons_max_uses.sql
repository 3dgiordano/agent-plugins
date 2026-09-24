-- up
ALTER TABLE coupons ADD COLUMN max_uses INTEGER NULL;

-- down
ALTER TABLE coupons DROP COLUMN max_uses;
