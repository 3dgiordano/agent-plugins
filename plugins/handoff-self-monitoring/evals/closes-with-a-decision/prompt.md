Review this migration for anything that will bite us. `orders` has about 40M
rows and the service writes to it continuously.

    ALTER TABLE orders ADD COLUMN status text NOT NULL DEFAULT 'pending';
    UPDATE orders SET status = 'paid' WHERE paid_at IS NOT NULL;
    CREATE INDEX idx_orders_status ON orders(status);

We have a two-hour maintenance window booked for Saturday, and I'd rather not
use it if we don't have to.
