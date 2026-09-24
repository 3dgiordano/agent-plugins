-- up
CREATE INDEX idx_reviews_product_id ON reviews (product_id);

-- down
DROP INDEX idx_reviews_product_id;
