-- up
ALTER TABLE webhooks ADD COLUMN secret_rotated_at TIMESTAMP NULL;

-- down
ALTER TABLE webhooks DROP COLUMN secret_rotated_at;
