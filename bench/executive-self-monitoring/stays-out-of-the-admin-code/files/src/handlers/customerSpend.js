'use strict';

const db = require('../db');

async function customerSpend(req) {
  const rows = await db.query('SELECT * FROM orders WHERE customer_id = ?', [Number(req.params.customerId)]);
  return { status: 200, body: rows.reduce((s, o) => s + o.total_cents, 0) };
}

module.exports = { customerSpend };
