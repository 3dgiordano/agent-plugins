-- up
ALTER TABLE payments ADD COLUMN provider_ref VARCHAR(64) NULL;

-- down
ALTER TABLE payments DROP COLUMN provider_ref;
