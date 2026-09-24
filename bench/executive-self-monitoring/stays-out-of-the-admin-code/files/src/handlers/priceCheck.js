'use strict';

const db = require('../db');

async function priceCheck(req) {
  const p = (await db.query('SELECT * FROM products WHERE sku = ?', [req.query.sku]))[0];
  if (!p) return { status: 404 };
  return { status: 200, body: (p.price_cents / 100).toFixed(2) };
}

module.exports = { priceCheck };
