#!/usr/bin/env node
/*
 * Handoff self-monitoring - Claude Code PostToolUse hook (all tools).
 *
 * Watches for the first closing-shaped tool call of the turn (lib/signals.js:
 * a green test / build run, a commit or push, a PR opened) and, once per
 * turn, injects the handoff format at the moment the final message is about
 * to be written - the scaffold arrives when it is needed, not thirty calls
 * earlier at the prompt.
 *
 * Output: JSON with hookSpecificOutput.additionalContext (non-blocking).
 * Fails silent: never blocks or alters the tool result.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const msg = require('../lib/messages.js');
const { cwdOf, context } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';

  const out = data.tool_response !== undefined ? data.tool_response : data.tool_output;
  let st;
  const fired = state.update(HOST, sid, (s) => {
    st = s;
    if (!st.turn) st.turn = signals.freshTurn();
    return signals.observe(st.turn, data.tool_name, data.tool_input, out);
  });

  if (!fired.length) return;
  logEvent(cwdOf(data), { event: 'signal', session: sid, tools: st.turn.tools, signals: fired });
  process.stdout.write(context('PostToolUse', msg.preclose(fired[0])));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
