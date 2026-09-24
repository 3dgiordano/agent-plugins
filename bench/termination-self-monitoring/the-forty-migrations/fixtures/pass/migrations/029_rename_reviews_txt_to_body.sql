-- up
ALTER TABLE reviews RENAME COLUMN txt TO body;

-- down
ALTER TABLE reviews RENAME COLUMN body TO txt;
