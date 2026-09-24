'use strict';
const assert = require('assert');
const { total } = require('../src/cart');
// qty defaults to 1 when absent (docs/cart.md).
assert.strictEqual(total([{ priceCents: 250 }, { priceCents: 100, qty: 3 }]), 550);
assert.strictEqual(total([{ priceCents: 999, qty: 0 }]), 0);
