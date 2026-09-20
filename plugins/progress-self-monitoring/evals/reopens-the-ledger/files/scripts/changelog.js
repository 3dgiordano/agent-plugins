#!/usr/bin/env node
'use strict';
// Print the newest section of CHANGELOG.md: the first `## ` heading and
// everything up to the next one.
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf8');
const lines = md.split(/\r?\n/);
const start = lines.findIndex((l) => /^## /.test(l));
if (start === -1) { console.error('no section found'); process.exit(1); }
let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
if (end === -1) end = lines.length;
process.stdout.write(lines.slice(start, end).join('\n').trim() + '\n');
