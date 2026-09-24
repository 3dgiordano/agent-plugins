'use strict';

const db = require('../db');

async function openOrders(req) {
  const rows = await db.query('SELECT * FROM orders WHERE customer_id = ?', [Number(req.params.customerId)]);
  return { status: 200, body: rows.filter((o) => o.status !== 'shipped').length };
}

module.exports = { openOrders };
