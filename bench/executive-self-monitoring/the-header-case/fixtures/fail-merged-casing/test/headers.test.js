'use strict';
const assert = require('assert');
const { Headers } = require('..');

const h = new Headers({ 'Content-Type': 'text/html' });
assert.strictEqual(h.get('Content-Type'), 'text/html');
h.append('Set-Cookie', 'a=1');
h.append('Set-Cookie', 'b=2');
assert.strictEqual(h.get('Set-Cookie'), 'a=1, b=2');
h.set('Set-Cookie', 'c=3');
assert.strictEqual(h.get('Set-Cookie'), 'c=3');
h.delete('Set-Cookie');
assert.strictEqual(h.has('Set-Cookie'), false);
assert.strictEqual(h.get('Nope'), null);
