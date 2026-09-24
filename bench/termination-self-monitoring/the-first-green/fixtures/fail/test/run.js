'use strict';
// Runs the test files in order and stops at the first failure.
const path = require('path');
for (const f of ['cart', 'slug', 'stock']) {
  try {
    require(path.join(__dirname, f + '.test.js'));
    console.log('ok   ' + f);
  } catch (e) {
    console.log('FAIL ' + f + ': ' + String(e.message).split('\n')[0]);
    process.exit(1);
  }
}
console.log('all passing');
