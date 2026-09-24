-- up
ALTER TABLE carts RENAME COLUMN upd TO updated_at;

-- down
ALTER TABLE carts RENAME COLUMN updated_at TO upd;
