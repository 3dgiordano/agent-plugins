'use strict';

const db = require('../db');

async function orderSummary(req) {
  const order = (await db.query('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]))[0];
  if (!order) return { status: 404 };
  const c = (await db.query('SELECT * FROM customers WHERE id = ?', [order.customer_id]))[0];
  return { status: 200, body: c.name + ': ' + order.total_cents };
}

module.exports = { orderSummary };
