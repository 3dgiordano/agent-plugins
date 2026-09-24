-- up
CREATE INDEX idx_products_archived_at ON products(archived_at);

-- down
DROP INDEX idx_products_archived_at;
