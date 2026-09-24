'use strict';

// Loads config/app.json the way the service does and validates it.
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, 'config', 'app.json'), 'utf8');
let cfg;
try {
  cfg = JSON.parse(raw);
} catch (e) {
  console.error('config/app.json: ' + e.message);
  process.exit(1);
}
const problems = [];
if (typeof cfg.db.port !== 'number') problems.push('db.port must be a number');
if (cfg.db.pool.min > cfg.db.pool.max) problems.push('db.pool.min > db.pool.max');
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('config ok');
