'use strict';
/*
 * Measure next-value prediction: the mean absolute error of the stack, against
 * two baselines that learn nothing.
 *   B0  copy the last value
 *   B1  constant velocity: last value plus the last step
 *
 *   node eval.js --set train|holdout [--online]
 *
 * Frozen by default (model.json loaded, no learning); --online lets the stack
 * learn while it is measured.
 */
const fs = require('fs');
const path = require('path');
const { sequence, seeds } = require('./src/world.js');
const { createStack } = require('./src/stack.js');

const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const set = arg('--set', 'train');
const online = argv.includes('--online');

let model = null;
try { model = JSON.parse(fs.readFileSync(path.join(__dirname, 'model.json'), 'utf8')); } catch (_) {
  if (!online) { console.error('no model.json: run `node train.js` first'); process.exit(1); }
}

const err = { stack: 0, B0: 0, B1: 0 };
let n = 0;
for (const s of seeds(set)) {
  const xs = sequence(set, s);
  const stack = createStack(model, { frozen: !online });
  for (let t = 0; t < xs.length - 1; t++) {
    stack.observe(xs[t]);
    if (t < 1) continue;
    const next = xs[t + 1];
    err.stack += Math.abs(stack.predict() - next);
    err.B0 += Math.abs(xs[t] - next);
    err.B1 += Math.abs(xs[t] + (xs[t] - xs[t - 1]) - next);
    n += 1;
  }
}
const f = (v) => (v / n).toFixed(3);
console.log(`set ${set}, ${online ? 'online' : 'frozen'}, ${seeds(set).length} sequences, ${n} predictions`);
console.log(`  stack ${f(err.stack)}   B0 ${f(err.B0)}   B1 ${f(err.B1)}`);
console.log(`  stack vs B0 ${((1 - err.stack / err.B0) * 100).toFixed(1)}% lower   vs B1 ${((1 - err.stack / err.B1) * 100).toFixed(1)}% lower`);
