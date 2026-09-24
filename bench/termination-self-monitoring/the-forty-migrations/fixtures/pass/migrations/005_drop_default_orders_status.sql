-- up
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;

-- down
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
