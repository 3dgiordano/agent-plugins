'use strict';
const assert = require('assert');
const { summaryLine } = require('../src/report');
assert.strictEqual(summaryLine({ customer: 'Ada Lovelace', totalCents: 12345, currency: 'USD', discount: 0.1 }), 'Ada Lovelace: 123.45 USD (10.0% off)');
assert.strictEqual(summaryLine({ customer: 'A very long customer name indeed', totalCents: 500, currency: 'EUR', discount: 0 }), 'A very long custome\u2026: 5.00 EUR (0.0% off)');
console.log('ok   report');
