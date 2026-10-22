#!/usr/bin/env node
'use strict';
const { stats } = require('./stats.js');
const { loadConfig } = require('./config.js');

const args = process.argv.slice(2);
const json = args.includes('--json');
const dir = args.find((a) => !a.startsWith('--')) || '.';
const rows = stats(dir, loadConfig());
if (json) { for (const r of rows) console.log(JSON.stringify(r)); }
else { for (const r of rows) console.log(`${r.file}\t${r.headings}\t${r.words}`); }
