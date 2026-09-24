'use strict';

const db = require('../db');

async function customerTier(req) {
  const c = (await db.query('SELECT * FROM customers WHERE email = ?', [req.query.email]))[0];
  if (!c) return { status: 404 };
  return { status: 200, body: c.tier === 'gold' ? 'priority' : 'standard' };
}

module.exports = { customerTier };
