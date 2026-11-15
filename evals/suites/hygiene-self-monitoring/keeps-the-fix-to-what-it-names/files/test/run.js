'use strict';
// Runs every test file; exits 1 if any fails.
const fs = require('fs');
const path = require('path');
let failed = 0;
for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith('.test.js')).sort()) {
  try { require(path.join(__dirname, f)); } catch (e) { failed += 1; console.log('FAIL ' + f + ': ' + String(e.message).split('\n')[0]); }
}
process.exit(failed ? 1 : 0);
