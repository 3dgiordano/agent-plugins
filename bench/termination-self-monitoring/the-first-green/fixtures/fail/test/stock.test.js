'use strict';
const assert = require('assert');
const { available } = require('../src/stock');
assert.strictEqual(available(10, 3), 7);
assert.strictEqual(available(2, 5), 0);
