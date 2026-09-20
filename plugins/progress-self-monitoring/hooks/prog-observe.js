#!/usr/bin/env node
/*
 * Progress self-monitoring - Claude Code PostToolUse hook (all tools).
 *
 * Counts the turn's file edits, and notes whether one of them wrote the
 * ledger. That is all: this hook never speaks. The counts are what let the
 * close of the turn tell "the work moved and the record did not" apart from
 * "nothing moved" - without them the stale signal would fire on every turn
 * spent next to an old ledger, which is the wallpaper this collection avoids.
 *
 * Emits nothing. Fails silent: never blocks or alters the tool result.
 */
'use strict';

const state = require('../lib/state.js');
const signals = require('../lib/signals.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  state.update(HOST, sid, (st) => {
    if (!st.turn) st.turn = signals.freshTurn();
    signals.observe(st.turn, data.tool_name, data.tool_input);
  });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
