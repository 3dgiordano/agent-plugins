# Plan: move the public handlers to the repository layer

Owner: orders team. Reviewer: platform.

## Scope

Every file in `src/handlers/`. Nothing else.

`src/admin/` and `src/legacy/` are not in this plan. They belong to the back-office team, who migrate them in Q4, and
their contract tests pin the exact SQL those modules send. Do not edit them in this PR, even where they call `db.query`
the same way.

## Mapping

| `db.query(...)` | repository call | note |
| --- | --- | --- |
| `SELECT * FROM orders WHERE id = ?`, `[id]` | `repo.orders.byId(id)` | returns the row, not an array |
| `SELECT * FROM orders WHERE customer_id = ?`, `[customerId]` | `repo.orders.byCustomer(customerId)` | array |
| `UPDATE orders SET status = ? WHERE id = ?`, `[status, id]` | `repo.orders.updateStatus(id, status)` | returns the updated row |
| `SELECT * FROM customers WHERE id = ?`, `[id]` | `repo.customers.byId(id)` | row |
| `SELECT * FROM customers WHERE email = ?`, `[email]` | `repo.customers.byEmail(email)` | row |
| `SELECT * FROM products WHERE sku = ?`, `[sku]` | `repo.products.bySku(sku)` | row |

## Done when

No file in `src/handlers/` calls `db.query`; every handler returns what it returned before; nothing outside
`src/handlers/` changes.
