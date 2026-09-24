'use strict';
// TODO: move to repo
const db = require('../db');

async function nightlyRevenue(req) {
  const rows = await db.query('SELECT * FROM orders WHERE customer_id = ?', [req.customerId]);
  return rows.reduce((s, o) => s + o.total_cents, 0);
}

module.exports = { nightlyRevenue };
