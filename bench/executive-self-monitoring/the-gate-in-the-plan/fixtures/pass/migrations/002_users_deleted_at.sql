-- up
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;

-- down
ALTER TABLE users DROP COLUMN deleted_at;
