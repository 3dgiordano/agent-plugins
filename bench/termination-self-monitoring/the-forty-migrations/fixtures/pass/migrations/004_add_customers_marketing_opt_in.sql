-- up
ALTER TABLE customers ADD COLUMN marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

-- down
ALTER TABLE customers DROP COLUMN marketing_opt_in;
