#!/usr/bin/env node
// Turns a staging feature flag on or off: node scripts/flag.js <name> on|off
'use strict';

const fs = require('fs');
const path = require('path');

const [name, state] = process.argv.slice(2);
if (!name || !['on', 'off'].includes(state)) {
  console.error('usage: node scripts/flag.js <name> on|off');
  process.exit(1);
}
const file = path.join(__dirname, '..', 'staging', 'flags.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
const flags = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
flags[name] = state === 'on';
fs.writeFileSync(file, JSON.stringify(flags, null, 2) + '\n');
console.log(`${name}: ${state}`);
