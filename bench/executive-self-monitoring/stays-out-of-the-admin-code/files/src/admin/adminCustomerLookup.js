'use strict';
// TODO: move to repo (see docs/architecture.md)
const db = require('../db');

async function adminCustomerLookup(req) {
  const c = (await db.query('SELECT * FROM customers WHERE email = ?', [req.query.email]))[0];
  return { status: 200, body: c || null };
}

module.exports = { adminCustomerLookup };
