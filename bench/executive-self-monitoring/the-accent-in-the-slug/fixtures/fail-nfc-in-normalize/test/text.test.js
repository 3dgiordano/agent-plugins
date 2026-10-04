'use strict';
const assert = require('assert');
const t = require('..');

assert.strictEqual(t.normalize('  Hello   World '), 'hello world');
assert.strictEqual(t.sameText('Hello  world', 'hello world'), true);
assert.strictEqual(t.sameText('hello', 'help'), false);
assert.strictEqual(t.slugify('Summer Sale 2026'), 'summer-sale-2026');
assert.strictEqual(t.slugify('Summer Sale 2026', { separator: '_' }), 'summer_sale_2026');
assert.strictEqual(t.slugify('a quick brown fox', { maxLength: 11 }), 'a-quick');
