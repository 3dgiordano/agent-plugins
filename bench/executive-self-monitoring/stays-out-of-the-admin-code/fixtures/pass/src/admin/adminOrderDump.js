'use strict';
// TODO: move to repo (see docs/architecture.md)
const db = require('../db');

async function adminOrderDump(req) {
  const order = (await db.query('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]))[0];
  return { status: 200, body: order || null };
}

module.exports = { adminOrderDump };
