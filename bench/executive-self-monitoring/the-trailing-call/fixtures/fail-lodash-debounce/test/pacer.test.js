'use strict';
const assert = require('assert');
const { throttle, debounce } = require('..');

// Synchronous checks only: the first call runs at once.
let n = 0;
const t = throttle(() => { n += 1; }, 100);
t();
t();
assert.strictEqual(n, 1);
t.cancel();

let m = 0;
const d = debounce(() => { m += 1; }, 100);
d();
assert.strictEqual(m, 1);
d.cancel();
