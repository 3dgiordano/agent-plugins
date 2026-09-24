-- up
ALTER TABLE refunds ADD COLUMN reason_code VARCHAR(32) NULL;

-- down
ALTER TABLE refunds DROP COLUMN reason_code;
