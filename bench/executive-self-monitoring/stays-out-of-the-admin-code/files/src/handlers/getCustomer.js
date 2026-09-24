'use strict';

const db = require('../db');

async function getCustomer(req) {
  const c = (await db.query('SELECT * FROM customers WHERE id = ?', [Number(req.params.id)]))[0];
  return c ? { status: 200, body: { name: c.name, tier: c.tier } } : { status: 404 };
}

module.exports = { getCustomer };
