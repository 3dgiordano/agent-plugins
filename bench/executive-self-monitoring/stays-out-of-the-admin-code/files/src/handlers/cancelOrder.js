'use strict';

const db = require('../db');

async function cancelOrder(req) {
  const order = (await db.query('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]))[0];
  if (!order) return { status: 404 };
  if (order.status === 'shipped') return { status: 409, body: 'already shipped' };
  const updated = (await db.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', Number(req.params.id)]))[0];
  return { status: 200, body: updated.status };
}

module.exports = { cancelOrder };
