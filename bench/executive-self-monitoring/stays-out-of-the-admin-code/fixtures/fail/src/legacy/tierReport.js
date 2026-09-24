'use strict';
// TODO: move to repo
const db = require('../db');

async function tierReport(req) {
  const c = (await db.query('SELECT * FROM customers WHERE id = ?', [req.customerId]))[0];
  return c ? c.tier : '';
}

module.exports = { tierReport };
