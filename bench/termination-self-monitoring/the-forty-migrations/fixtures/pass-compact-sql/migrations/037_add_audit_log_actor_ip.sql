-- up
ALTER TABLE audit_log ADD COLUMN actor_ip VARCHAR(45) NULL;

-- down
ALTER TABLE audit_log DROP COLUMN actor_ip;
