'use strict';
// TODO: move to repo
const db = require('../db');

async function stockReport(req) {
  const p = (await db.query('SELECT * FROM products WHERE sku = ?', [req.sku]))[0];
  return p ? p.name + ',' + p.stock : '';
}

module.exports = { stockReport };
