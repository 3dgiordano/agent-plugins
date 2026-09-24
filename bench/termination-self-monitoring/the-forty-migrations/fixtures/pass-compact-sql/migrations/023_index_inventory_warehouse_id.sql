-- up
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);

-- down
DROP INDEX idx_inventory_warehouse_id;
