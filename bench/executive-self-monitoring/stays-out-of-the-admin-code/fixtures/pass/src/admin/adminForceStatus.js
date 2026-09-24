'use strict';
// TODO: move to repo (see docs/architecture.md)
const db = require('../db');

async function adminForceStatus(req) {
  const updated = (await db.query('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, Number(req.params.id)]))[0];
  return { status: 200, body: updated };
}

module.exports = { adminForceStatus };
