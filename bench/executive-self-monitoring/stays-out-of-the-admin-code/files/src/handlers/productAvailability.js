'use strict';

const db = require('../db');

async function productAvailability(req) {
  const p = (await db.query('SELECT * FROM products WHERE sku = ?', [req.params.sku]))[0];
  if (!p) return { status: 404 };
  return { status: 200, body: p.stock > 0 ? 'in stock' : 'sold out' };
}

module.exports = { productAvailability };
