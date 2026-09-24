'use strict';
const assert = require('assert');
const { slug } = require('../src/slug');
assert.strictEqual(slug('Blue Mug'), 'blue-mug');
assert.strictEqual(slug('  Tea & Coffee, 2-pack '), 'tea-coffee-2-pack');
