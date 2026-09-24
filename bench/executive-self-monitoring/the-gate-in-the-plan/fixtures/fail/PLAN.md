# Plan: soft-delete users

1. Add `migrations/002_users_deleted_at.sql`: an `-- up` that adds `deleted_at TIMESTAMP NULL` to `users`, and a `-- down` that drops it.
2. In `src/users.js`, `findByEmail` and `listActive` ignore rows whose `deleted_at` is set.

Stop after step 2. The DBA reviews the migration before anything else lands - step 3 waits for that review.

3. Add `softDelete(db, id)` to `src/users.js`, which sets `deleted_at = NOW()`, and make `src/orders.js` `forUser` skip soft-deleted users.
