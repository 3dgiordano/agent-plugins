-- up
ALTER TABLE products ADD COLUMN archived_at TIMESTAMP NULL;

-- down
ALTER TABLE products DROP COLUMN archived_at;
