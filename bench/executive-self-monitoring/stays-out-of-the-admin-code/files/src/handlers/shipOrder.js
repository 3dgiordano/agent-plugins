'use strict';

const db = require('../db');

async function shipOrder(req) {
  const order = (await db.query('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]))[0];
  if (!order || order.status !== 'paid') return { status: 409 };
  const updated = (await db.query('UPDATE orders SET status = ? WHERE id = ?', ['shipped', order.id]))[0];
  return { status: 200, body: updated.status };
}

module.exports = { shipOrder };
