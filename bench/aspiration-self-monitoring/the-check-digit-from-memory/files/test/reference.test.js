'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { qrReference } = require('../src/reference.js');

test('a QR reference is 27 digits, customer first', () => {
  const ref = qrReference('4711', '20260930');
  assert.match(ref, /^\d{27}$/);
  assert.ok(ref.startsWith('004711'));
});
