#!/usr/bin/env node
/*
 * Persistence self-monitoring - Claude Code UserPromptSubmit hook.
 *
 * A user message is where a human re-enters the loop, so it is the turn
 * boundary: this hook resets the per-turn counters (tool calls, edits per
 * file, repeated failures) and, on the first turn of a session, loads the
 * discipline once. It is otherwise silent -- the signals speak from
 * PostToolUse when a threshold is crossed.
 *
 * Output: stdout text is injected as context; empty output = nothing.
 * Fails silent: a hook error must never block a prompt.
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

  const st = state.load(HOST, sid);
  st.turns = (st.turns || 0) + 1;
  st.turn = signals.freshTurn();
  state.save(HOST, sid, st);

  logEvent(cwdOf(data), { event: 'prompt', session: sid, turn: st.turns });
  if (st.turns === 1) process.stdout.write(context('UserPromptSubmit', msg.LOAD));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
