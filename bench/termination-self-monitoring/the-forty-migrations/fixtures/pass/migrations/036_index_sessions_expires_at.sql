-- up
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

-- down
DROP INDEX idx_sessions_expires_at;
