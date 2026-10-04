'use strict';
const assert = require('assert');
const qs = require('..');

assert.strictEqual(qs.stringify({ a: 1, b: 'two' }), 'a=1&b=two');
assert.strictEqual(qs.stringify({ a: ['1', '2'] }), 'a=1&a=2');
assert.strictEqual(qs.stringify({ ok: true, n: null }), 'ok=true&n=');
assert.strictEqual(qs.stringify({}), '');
