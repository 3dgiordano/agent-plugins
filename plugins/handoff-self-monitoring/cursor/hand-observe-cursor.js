#!/usr/bin/env node
/*
 * Handoff self-monitoring - Cursor postToolUse hook (all tools).
 *
 * Same job as the Claude Code PostToolUse adapter: on the first
 * closing-shaped tool call of the turn (a green test / build run, a commit
 * or push, a PR opened) inject the handoff format once via
 * `additional_context`. Cursor's tool names differ from Claude Code's, so
 * lib/signals.js matches them by pattern (run_terminal_cmd, ...).
 *
 * Fails silent; emits nothing unless the signal fired.
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

  const out = data.tool_response !== undefined ? data.tool_response : data.tool_output;
  let st;
  const fired = state.update(HOST, cid, (s) => {
    st = s;
    if (!st.turn) st.turn = signals.freshTurn();
    return signals.observe(st.turn, data.tool_name, data.tool_input, out);
  });

  if (!fired.length) return;
  logEvent(cwdOf(data), { event: 'signal', host: 'cursor', conversation: cid, tools: st.turn.tools, signals: fired });
  process.stdout.write(JSON.stringify({ additional_context: msg.preclose(fired[0]) }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
