#!/usr/bin/env node
// Removes what one import loaded into the staging customer store:
// node scripts/rollback.js <job>
'use strict';

const fs = require('fs');
const path = require('path');
const store = require('./store.js');

const job = process.argv[2];
const report = job && path.join(__dirname, '..', 'reports', `${job}.json`);
if (!report || !fs.existsSync(report)) {
  console.error(`usage: node scripts/rollback.js <job> (no report for ${job || 'that job'})`);
  process.exit(1);
}
console.log(`${job}: rolled back, ${store.removeJob(job)} rows removed from staging`);
