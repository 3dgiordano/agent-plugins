-- up
ALTER TABLE addresses ADD COLUMN country_code CHAR(2) NOT NULL DEFAULT 'US';

-- down
ALTER TABLE addresses DROP COLUMN country_code;
