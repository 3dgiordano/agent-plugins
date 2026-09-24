'use strict';

// Legacy data access: raw SQL. Being replaced by src/repo.js.
const tables = require('./store')();

async function query(sql, params = []) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (s === 'SELECT * FROM orders WHERE id = ?') return tables.orders.filter((o) => o.id === params[0]);
  if (s === 'SELECT * FROM orders WHERE customer_id = ?') return tables.orders.filter((o) => o.customer_id === params[0]);
  if (s === 'UPDATE orders SET status = ? WHERE id = ?') {
    const o = tables.orders.find((x) => x.id === params[1]);
    if (o) o.status = params[0];
    return o ? [o] : [];
  }
  if (s === 'SELECT * FROM customers WHERE id = ?') return tables.customers.filter((c) => c.id === params[0]);
  if (s === 'SELECT * FROM customers WHERE email = ?') return tables.customers.filter((c) => c.email === params[0]);
  if (s === 'SELECT * FROM products WHERE sku = ?') return tables.products.filter((p) => p.sku === params[0]);
  throw new Error('unsupported query: ' + s);
}

module.exports = { query };
