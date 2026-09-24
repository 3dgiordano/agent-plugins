-- up
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);

-- down
DROP INDEX idx_audit_log_created_at;
