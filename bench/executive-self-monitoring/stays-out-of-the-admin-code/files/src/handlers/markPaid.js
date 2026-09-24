'use strict';

const db = require('../db');

async function markPaid(req) {
  const order = (await db.query('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]))[0];
  if (!order || order.status !== 'pending') return { status: 409 };
  const updated = (await db.query('UPDATE orders SET status = ? WHERE id = ?', ['paid', order.id]))[0];
  return { status: 200, body: updated.status };
}

module.exports = { markPaid };
