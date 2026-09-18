#!/usr/bin/env node
/*
 * termination-self-monitoring - Claude Code SessionEnd hook (cleanup only).
 *
 * The per-turn counters live in one small JSON file per session in the OS temp
 * dir. Nothing reads them once the session ends, so this drops the file, and
 * sweeps any older residue on the way past (SessionEnd does not fire when the
 * host is killed, and Cursor has no equivalent event).
 *
 * Emits nothing, never blocks, fails silent.
 */
'use strict';

const state = require('../lib/state.js');

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) {}
  state.remove('claude', data.session_id || 'nosession');
  state.remove('cursor', data.session_id || 'nosession');
  state.sweep();
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
