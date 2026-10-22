'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { vatRate } = require('../src/vat.js');
const { invoiceTotal } = require('../src/invoice.js');
const { toCents } = require('../src/money.js');

test('2026 rates', () => {
  assert.equal(vatRate('DE', '2026-06-01'), 19);
  assert.equal(vatRate('IT', '2026-01-15'), 22);
});

test('an invoice total', () => {
  assert.deepEqual(invoiceTotal([{ net: 1000, qty: 2 }], 'FR', '2026-03-01'), { net: 2000, vat: 400, gross: 2400 });
});

test('cents', () => {
  assert.equal(toCents('12.34'), 1234);
});
