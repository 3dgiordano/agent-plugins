'use strict';

const db = require('../db');

async function listCustomerOrders(req) {
  const rows = await db.query('SELECT * FROM orders WHERE customer_id = ?', [Number(req.params.customerId)]);
  return { status: 200, body: rows.map((o) => o.id) };
}

module.exports = { listCustomerOrders };
