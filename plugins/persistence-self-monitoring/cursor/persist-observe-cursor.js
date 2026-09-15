#!/usr/bin/env node
/*
 * Persistence self-monitoring - Cursor postToolUse hook (all tools).
 *
 * Same job as the Claude Code PostToolUse adapter: record the call into the
 * turn's counters and, only when a threshold is crossed, inject a nudge with
 * the actual count via `additional_context`. Cursor's tool names differ from
 * Claude Code's, so lib/signals.js matches them by pattern (edit_file,
 * run_terminal_cmd, ...) rather than by exact name.
 *
 * Fails silent; emits nothing unless a signal fired.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const msg = require('../lib/messages.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';

  let st;
  const fired = state.update(HOST, cid, (s) => {
    st = s;
    if (!st.turn) st.turn = signals.freshTurn();
    return signals.observe(st.turn, data.tool_name, data.tool_input, data.tool_output);
  });

  if (!fired.length) return;
  logEvent(cwdOf(data), { event: 'signal', host: 'cursor', conversation: cid, tools: st.turn.tools, signals: fired });
  process.stdout.write(JSON.stringify({ additional_context: msg.nudge(fired) }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
