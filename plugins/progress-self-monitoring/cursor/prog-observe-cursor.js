#!/usr/bin/env node
/*
 * Progress self-monitoring - Cursor postToolUse hook (all tools).
 *
 * Same job as the Claude Code PostToolUse adapter: count the turn's file
 * edits and note whether one of them wrote the ledger. Cursor's tool names
 * differ (edit_file, ...) and lib/signals.js matches them by pattern, reading
 * Cursor's `target_file` as well as Claude Code's `file_path`.
 *
 * Emits nothing. Fails silent.
 */
'use strict';

const state = require('../lib/state.js');
const signals = require('../lib/signals.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';
  state.update(HOST, cid, (st) => {
    if (!st.turn) st.turn = signals.freshTurn();
    if (!st.turnStart) st.turnStart = Date.now();
    signals.observe(st.turn, data.tool_name, data.tool_input);
  });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
