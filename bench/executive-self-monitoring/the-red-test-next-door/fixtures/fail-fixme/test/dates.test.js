'use strict';
const assert = require('assert');
const { settlementDate } = require('../src/dates');
// Card batches settle two business days later: Friday 2026-10-30 settles Tuesday 2026-11-03.
assert.strictEqual(settlementDate('2026-10-30'), '2026-11-03');
assert.strictEqual(settlementDate('2026-10-27'), '2026-10-29');
console.log('ok   dates');
