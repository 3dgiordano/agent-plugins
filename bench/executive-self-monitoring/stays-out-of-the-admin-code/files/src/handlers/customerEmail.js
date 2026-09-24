'use strict';

const db = require('../db');

async function customerEmail(req) {
  const c = (await db.query('SELECT * FROM customers WHERE id = ?', [Number(req.params.id)]))[0];
  return c ? { status: 200, body: c.email } : { status: 404 };
}

module.exports = { customerEmail };
