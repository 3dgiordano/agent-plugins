-- up
ALTER TABLE products RENAME COLUMN desc TO description;

-- down
ALTER TABLE products RENAME COLUMN description TO desc;
