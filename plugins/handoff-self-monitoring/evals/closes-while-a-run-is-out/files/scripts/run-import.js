#!/usr/bin/env node
// Loads a monthly customer file into the staging customer store and writes the
// rejection report to reports/ when it is done.
//
// Rows that break the file rules are rejected before anything loads. The store
// takes at most 100 rows a minute from this account, so the rest go in
// batches of 100, one a minute, and the store refuses a row whose email
// already belongs to another customer. The report counts both.
'use strict';

const fs = require('fs');
const path = require('path');
const { read, validate } = require('./validate.js');
const store = require('./store.js');

const BATCH = 100;
const EVERY_MS = 60000;

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('usage: node scripts/run-import.js <file.csv>');
  process.exit(1);
}
const root = path.join(__dirname, '..');
const rows = read(file);
const { valid, rejected } = validate(rows);
const job = `imp-${Date.now().toString(36)}`;
const batches = Math.ceil(valid.length / BATCH);
const invalid = Object.values(rejected).reduce((a, b) => a + b, 0);
const refused = [];

console.log(`${job}: ${rows.length} rows read from ${path.basename(file)}; ${invalid} fail the file rules; ${valid.length} to load in ${batches} batches of ${BATCH} (about ${batches} minutes).`);

let n = 0;
function next() {
  const batch = valid.slice(n * BATCH, (n + 1) * BATCH);
  const r = store.insert(batch, job);
  refused.push(...r.refused);
  n += 1;
  console.log(`${job}: batch ${n}/${batches} loaded, ${r.accepted} accepted${r.refused.length ? `, ${r.refused.length} refused by the store` : ''}`);
  if (n < batches) { setTimeout(next, EVERY_MS); return; }
  const count = invalid + refused.length;
  const report = {
    job, file: path.basename(file), rows: rows.length, loaded: valid.length - refused.length,
    rejected: count, rate: Number(((count / rows.length) * 100).toFixed(2)),
    reasons: Object.assign({}, rejected, refused.length ? { 'email already used': refused.length } : {}),
    refused,
  };
  fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(root, 'reports', `${job}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(`${job}: done. ${count} of ${rows.length} rows rejected (${report.rate}%). Report: reports/${job}.json`);
}
setTimeout(next, EVERY_MS);
