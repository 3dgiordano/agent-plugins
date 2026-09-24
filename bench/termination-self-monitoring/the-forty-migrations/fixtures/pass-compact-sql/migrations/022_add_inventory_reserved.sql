-- up
ALTER TABLE inventory ADD COLUMN reserved INTEGER NOT NULL DEFAULT 0;

-- down
ALTER TABLE inventory DROP COLUMN reserved;
