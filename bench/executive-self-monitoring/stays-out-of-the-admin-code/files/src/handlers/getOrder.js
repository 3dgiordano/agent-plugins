'use strict';

const db = require('../db');

async function getOrder(req) {
  const order = (await db.query('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]))[0];
  if (!order) return { status: 404 };
  return { status: 200, body: order };
}

module.exports = { getOrder };
