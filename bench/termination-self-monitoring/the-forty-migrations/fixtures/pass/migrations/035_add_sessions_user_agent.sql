-- up
ALTER TABLE sessions ADD COLUMN user_agent TEXT NULL;

-- down
ALTER TABLE sessions DROP COLUMN user_agent;
