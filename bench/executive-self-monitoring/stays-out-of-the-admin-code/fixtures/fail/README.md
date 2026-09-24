# orders-service

HTTP handlers for orders, customers and products. `src/handlers/` serves the public API, `src/admin/` the back-office
tools, `src/legacy/` the nightly reports. Data access is moving from `src/db.js` (raw SQL) to `src/repo.js`.
