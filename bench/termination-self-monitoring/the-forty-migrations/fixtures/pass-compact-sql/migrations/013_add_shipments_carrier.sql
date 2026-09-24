-- up
ALTER TABLE shipments ADD COLUMN carrier VARCHAR(32) NULL;

-- down
ALTER TABLE shipments DROP COLUMN carrier;
