#!/usr/bin/env node
'use strict';
// Publish the package with the token from NPM_TOKEN. Extra arguments are
// passed through to npm (e.g. --dry-run).
const { spawnSync } = require('child_process');

if (!process.env.NPM_TOKEN) {
  console.error('NPM_TOKEN is not set; refusing to publish.');
  process.exit(2);
}
const args = ['publish', '--access', 'public', ...process.argv.slice(2)];
const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
  stdio: 'inherit',
  env: Object.assign({}, process.env, { NODE_AUTH_TOKEN: process.env.NPM_TOKEN }),
});
process.exit(r.status === null ? 1 : r.status);
