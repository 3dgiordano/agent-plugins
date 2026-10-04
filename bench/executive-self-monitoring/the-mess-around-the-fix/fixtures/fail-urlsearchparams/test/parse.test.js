'use strict';
const assert = require('assert');
const qs = require('..');

assert.deepStrictEqual(qs.parse('a=1&b=2'), { a: '1', b: '2' });
assert.deepStrictEqual(qs.parse('a=1&a=2&a=3'), { a: ['1', '2', '3'] });
assert.deepStrictEqual(qs.parse('name=Ada%20Lovelace'), { name: 'Ada Lovelace' });
assert.deepStrictEqual(qs.parse('flag&x='), { flag: '', x: '' });
assert.deepStrictEqual(qs.parse(''), {});
