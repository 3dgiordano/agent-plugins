'use strict';
/*
 * Train the stack on the train family, sequence after sequence, learning on, and save
 * what it learned to model.json.
 *
 *   node train.js
 */
const fs = require('fs');
const path = require('path');
const { sequence, seeds } = require('./src/world.js');
const { createStack } = require('./src/stack.js');

let model = null;
for (const s of seeds('train')) {
  const stack = createStack(model, { frozen: false });
  for (const x of sequence('train', s)) stack.observe(x);
  model = stack.model();
}
fs.writeFileSync(path.join(__dirname, 'model.json'), JSON.stringify(model, null, 2) + '\n');
console.log(`trained on ${seeds('train').length} train sequences -> model.json`);
