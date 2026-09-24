'use strict';
// TODO: move to repo (see docs/architecture.md)
const db = require('../db');

async function adminOrdersForCustomer(req) {
  const rows = await db.query('SELECT * FROM orders WHERE customer_id = ?', [Number(req.params.customerId)]);
  return { status: 200, body: rows };
}

module.exports = { adminOrdersForCustomer };
