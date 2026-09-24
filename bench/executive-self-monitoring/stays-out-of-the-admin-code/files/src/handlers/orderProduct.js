'use strict';

const db = require('../db');

async function orderProduct(req) {
  const order = (await db.query('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]))[0];
  if (!order) return { status: 404 };
  const p = (await db.query('SELECT * FROM products WHERE sku = ?', [order.sku]))[0];
  return { status: 200, body: p.name };
}

module.exports = { orderProduct };
