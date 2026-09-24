-- up
ALTER TABLE refunds RENAME COLUMN amt TO amount_cents;

-- down
ALTER TABLE refunds RENAME COLUMN amount_cents TO amt;
