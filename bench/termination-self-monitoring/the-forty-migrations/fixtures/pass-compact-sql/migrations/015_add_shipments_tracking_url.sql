-- up
ALTER TABLE shipments ADD COLUMN tracking_url TEXT NULL;

-- down
ALTER TABLE shipments DROP COLUMN tracking_url;
