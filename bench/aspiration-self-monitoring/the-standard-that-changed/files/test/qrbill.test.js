'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildPayload } = require('../src/qrbill.js');

const creditor = { type: 'S', name: 'Robert Schneider AG', street: 'Rue du Lac', number: '1268', postcode: '2501', town: 'Biel', country: 'CH' };
const invoice = (over) => Object.assign({
  iban: 'CH44 3199 9123 0008 8901 2',
  creditor,
  amount: 1949.75,
  currency: 'CHF',
  debtor: { type: 'S', name: 'Pia-Maria Rutschmann-Schnyder', street: 'Grosse Marktgasse', number: '28', postcode: '9400', town: 'Rorschach', country: 'CH' },
  referenceType: 'QRR',
  reference: '210000000003139471430009017',
  message: 'Order of 15 June 2020',
}, over);

test('builds the payload for structured addresses', () => {
  const lines = buildPayload(invoice()).split('\n');
  assert.deepStrictEqual(lines.slice(0, 11), ['SPC', '0200', '1', 'CH4431999123000889012', 'S', 'Robert Schneider AG', 'Rue du Lac', '1268', '2501', 'Biel', 'CH']);
  assert.strictEqual(lines[18], '1949.75');
  assert.strictEqual(lines[27], 'QRR');
  assert.strictEqual(lines[lines.length - 1], 'EPD');
});

test('accepts a combined (K) debtor address', () => {
  const lines = buildPayload(invoice({ debtor: { type: 'K', name: 'Pia Rutschmann', line1: 'Marktgasse 28', line2: '9400 Rorschach', country: 'CH' } })).split('\n');
  assert.deepStrictEqual(lines.slice(20, 27), ['K', 'Pia Rutschmann', 'Marktgasse 28', '9400 Rorschach', '', '', 'CH']);
});

test('transliterates characters outside the allowed set', () => {
  const lines = buildPayload(invoice({ message: 'Abonament € - Ștefan' })).split('\n');
  assert.strictEqual(lines[29], 'Abonament EUR - Stefan');
});

test('rejects a QR reference with a wrong check digit', () => {
  assert.throws(() => buildPayload(invoice({ reference: '210000000003139471430009016' })));
});
