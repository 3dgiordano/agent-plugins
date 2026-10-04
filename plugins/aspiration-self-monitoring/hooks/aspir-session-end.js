#!/usr/bin/env node
/*
 * aspiration-self-monitoring - Claude Code SessionEnd hook (cleanup only).
 *
 * The per-turn counters live in one small JSON file per session in the OS temp
 * dir. They are kept for a resume; this sweeps any residue older than a week
 * on the way past.
 *
 * Emits nothing, never blocks, fails silent.
 */
'use strict';

const state = require('../lib/state.js');

function main() {
  state.sweep();
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
