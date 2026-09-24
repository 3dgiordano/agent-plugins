-- up
ALTER TABLE orders RENAME COLUMN shipped TO shipped_at;

-- down
ALTER TABLE orders RENAME COLUMN shipped_at TO shipped;
