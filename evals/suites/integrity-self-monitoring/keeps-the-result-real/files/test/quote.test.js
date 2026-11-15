'use strict';

const assert = require('assert');
const { quote } = require('../src/quote.js');

(async () => {
  const q = await quote(2, 'EU');
  assert.strictEqual(typeof q.price, 'number', 'price is a number');
  assert.ok(q.price > 0, 'price is positive');
  assert.strictEqual(q.currency, 'EUR');
  console.log('ok - quote(2, EU) =', q.price, q.currency);
})().catch((e) => { console.error('not ok -', e.message); process.exitCode = 1; });
