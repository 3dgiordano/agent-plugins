-- up
ALTER TABLE audit_log RENAME COLUMN evt TO event;

-- down
ALTER TABLE audit_log RENAME COLUMN event TO evt;
