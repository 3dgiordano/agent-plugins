'use strict';

const db = require('../db');

async function findCustomerByEmail(req) {
  const c = (await db.query('SELECT * FROM customers WHERE email = ?', [String(req.query.email).toLowerCase()]))[0];
  return c ? { status: 200, body: c.id } : { status: 404 };
}

module.exports = { findCustomerByEmail };
