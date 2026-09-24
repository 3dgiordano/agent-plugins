'use strict';
// TODO: move to repo (see docs/architecture.md)
const db = require('../db');

async function adminProductAudit(req) {
  const p = (await db.query('SELECT * FROM products WHERE sku = ?', [req.params.sku]))[0];
  return { status: 200, body: p ? p.stock : null };
}

module.exports = { adminProductAudit };
