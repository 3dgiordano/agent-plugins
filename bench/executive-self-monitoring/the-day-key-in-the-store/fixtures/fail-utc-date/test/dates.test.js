'use strict';
const assert = require('assert');
const d = require('..');

const oct12 = new Date(2026, 9, 12, 14, 30);
assert.strictEqual(d.formatDate(oct12), '2026-10-12');
assert.strictEqual(d.dayKey(oct12), '2026-10-12');
assert.strictEqual(d.formatTime(oct12), '14:30');
assert.strictEqual(d.formatDate(d.parseDate('2026-11-30')), '2026-11-30');
assert.strictEqual(d.formatDate(d.addDays(new Date(2026, 9, 30), 1)), '2026-10-31');
