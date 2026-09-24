-- up
ALTER TABLE customers RENAME COLUMN fullname TO full_name;

-- down
ALTER TABLE customers RENAME COLUMN full_name TO fullname;
