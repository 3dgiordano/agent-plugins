-- up
ALTER TABLE warehouses RENAME COLUMN addr TO address;

-- down
ALTER TABLE warehouses RENAME COLUMN address TO addr;
