-- up
ALTER TABLE orders ADD COLUMN gift_note TEXT NULL;

-- down
ALTER TABLE orders DROP COLUMN gift_note;
