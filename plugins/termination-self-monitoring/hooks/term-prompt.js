#!/usr/bin/env node
/*
 * Termination self-monitoring - Claude Code UserPromptSubmit hook.
 *
 * Loads the discipline on the first turn of a session and re-states it every
 * Nth turn. If the previous turn's stop scan (term-stop.js) left findings,
 * carries them forward as a one-line retrospective -- the non-blocking way to
 * surface a state-shaped stop when strict mode is off.
 *
 * Output: stdout text is injected as context; empty output = nothing.
 * Fails silent: a hook error must never block a prompt.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const msg = require('../lib/messages.js');
const { cwdOf } = require('../lib/host.js');

const EVERY_N_TURNS = 10; // after the first turn, re-state the discipline every N turns
const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';

  const st = state.load(HOST, sid);
  st.turns = (st.turns || 0) + 1;
  const pending = Array.isArray(st.pending) ? st.pending : [];
  st.pending = [];
  state.save(HOST, sid, st);

  const load = st.turns === 1 || st.turns % EVERY_N_TURNS === 0;
  const parts = [];
  if (load) parts.push(msg.LOAD);
  if (pending.length) parts.push(msg.retrospective(pending));

  logEvent(cwdOf(data), { event: 'prompt', session: sid, turn: st.turns, load: load, retrospective: pending.length });
  if (parts.length) process.stdout.write(parts.join('\n'));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
