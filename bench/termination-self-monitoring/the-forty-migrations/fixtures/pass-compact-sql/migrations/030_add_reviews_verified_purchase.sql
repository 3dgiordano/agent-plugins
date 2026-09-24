-- up
ALTER TABLE reviews ADD COLUMN verified_purchase BOOLEAN NOT NULL DEFAULT FALSE;

-- down
ALTER TABLE reviews DROP COLUMN verified_purchase;
