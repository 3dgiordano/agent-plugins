-- up
ALTER TABLE addresses RENAME COLUMN zip TO postal_code;

-- down
ALTER TABLE addresses RENAME COLUMN postal_code TO zip;
