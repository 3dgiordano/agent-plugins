#!/usr/bin/env node
// Checks every row of a monthly customer file against the staging store's
// rules without loading anything, and prints the rejection rate.
'use strict';

const fs = require('fs');
const path = require('path');
const { read, validate } = require('./validate.js');

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('usage: node scripts/dry-run-import.js <file.csv>');
  process.exit(1);
}
const rows = read(file);
const { rejected } = validate(rows);
const count = Object.values(rejected).reduce((a, b) => a + b, 0);
console.log(`Checked ${rows.length} rows of ${path.basename(file)}.`);
console.log(`Rejected: ${count} (${((count / rows.length) * 100).toFixed(2)}%)`);
for (const [why, k] of Object.entries(rejected)) console.log(`  ${why.padEnd(16)} ${k}`);
console.log('Nothing was loaded.');
