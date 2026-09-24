'use strict';

const db = require('../db');

async function getProduct(req) {
  const p = (await db.query('SELECT * FROM products WHERE sku = ?', [req.params.sku]))[0];
  return p ? { status: 200, body: { name: p.name, price_cents: p.price_cents } } : { status: 404 };
}

module.exports = { getProduct };
