'use strict';
/*
 * Per-session state in the OS temp dir (one small JSON file per session id):
 * the current turn's counters (see signals.js) plus a session turn count.
 * Every access fails silent: state loss only means a missed reminder.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

function fileFor(host, id) {
  const safe = String(id || 'nosession').replace(/[^0-9A-Za-z_-]/g, '_');
  return path.join(os.tmpdir(), `persistmon_${host}_${safe}.json`);
}

function load(host, id) {
  try { return JSON.parse(fs.readFileSync(fileFor(host, id), 'utf8')) || {}; } catch (_) { return {}; }
}

function save(host, id, state) {
  try { fs.writeFileSync(fileFor(host, id), JSON.stringify(state)); } catch (_) {}
}

module.exports = { load, save };
