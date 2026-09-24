# Schema changes for release 4.2

One migration per row, numbered in this order, starting at 001. File name: `migrations/NNN_<slug>.sql`, where the slug is
`add_<table>_<column>`, `index_<table>_<column>`, `rename_<table>_<old>_to_<new>`, or `drop_default_<table>_<column>`.

Conventions (see `migrations/000_init.sql`): an `-- up` section, then a `-- down` section that undoes it. An index is named `idx_<table>_<column>`. The default dropped from `orders.status` was `'pending'`; the down section puts it back.

| # | change |
| --- | --- |
| 1 | add column `orders.gift_note` TEXT NULL |
| 2 | index `orders.customer_id` |
| 3 | rename `customers.fullname` to `full_name` |
| 4 | add column `customers.marketing_opt_in` BOOLEAN NOT NULL DEFAULT FALSE |
| 5 | drop the default of `orders.status` |
| 6 | add column `order_items.discount_cents` INTEGER NOT NULL DEFAULT 0 |
| 7 | index `order_items.sku` |
| 8 | rename `orders.shipped` to `shipped_at` |
| 9 | add column `payments.provider_ref` VARCHAR(64) NULL |
| 10 | index `payments.provider_ref` |
| 11 | add column `refunds.reason_code` VARCHAR(32) NULL |
| 12 | rename `refunds.amt` to `amount_cents` |
| 13 | add column `shipments.carrier` VARCHAR(32) NULL |
| 14 | index `shipments.order_id` |
| 15 | add column `shipments.tracking_url` TEXT NULL |
| 16 | rename `addresses.zip` to `postal_code` |
| 17 | add column `addresses.country_code` CHAR(2) NOT NULL DEFAULT 'US' |
| 18 | index `addresses.customer_id` |
| 19 | add column `products.archived_at` TIMESTAMP NULL |
| 20 | index `products.archived_at` |
| 21 | rename `products.desc` to `description` |
| 22 | add column `inventory.reserved` INTEGER NOT NULL DEFAULT 0 |
| 23 | index `inventory.warehouse_id` |
| 24 | add column `warehouses.timezone` VARCHAR(40) NOT NULL DEFAULT 'UTC' |
| 25 | rename `warehouses.addr` to `address` |
| 26 | add column `coupons.max_uses` INTEGER NULL |
| 27 | index `coupons.code` |
| 28 | add column `coupons.expires_at` TIMESTAMP NULL |
| 29 | rename `reviews.txt` to `body` |
| 30 | add column `reviews.verified_purchase` BOOLEAN NOT NULL DEFAULT FALSE |
| 31 | index `reviews.product_id` |
| 32 | add column `carts.abandoned_at` TIMESTAMP NULL |
| 33 | index `carts.customer_id` |
| 34 | rename `carts.upd` to `updated_at` |
| 35 | add column `sessions.user_agent` TEXT NULL |
| 36 | index `sessions.expires_at` |
| 37 | add column `audit_log.actor_ip` VARCHAR(45) NULL |
| 38 | index `audit_log.created_at` |
| 39 | rename `audit_log.evt` to `event` |
| 40 | add column `webhooks.secret_rotated_at` TIMESTAMP NULL |
