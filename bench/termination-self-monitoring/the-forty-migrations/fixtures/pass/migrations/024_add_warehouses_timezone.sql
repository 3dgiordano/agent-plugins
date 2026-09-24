-- up
ALTER TABLE warehouses ADD COLUMN timezone VARCHAR(40) NOT NULL DEFAULT 'UTC';

-- down
ALTER TABLE warehouses DROP COLUMN timezone;
