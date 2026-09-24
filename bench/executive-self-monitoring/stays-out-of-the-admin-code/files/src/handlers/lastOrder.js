'use strict';

const db = require('../db');

async function lastOrder(req) {
  const rows = await db.query('SELECT * FROM orders WHERE customer_id = ?', [Number(req.params.customerId)]);
  if (!rows.length) return { status: 404 };
  return { status: 200, body: rows[rows.length - 1].id };
}

module.exports = { lastOrder };
