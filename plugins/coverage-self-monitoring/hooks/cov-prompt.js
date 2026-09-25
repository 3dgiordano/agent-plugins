#!/usr/bin/env node
/*
 * Coverage self-monitoring - Claude Code UserPromptSubmit hook (turn boundary).
 *
 * A user message is where a human re-enters the loop, so it is the turn
 * boundary: resets the per-turn stub counters, loads the discipline once on
 * the first turn, asks for a ledger when the prompt enumerates PARTS_MIN or
 * more items, and carries forward any findings the previous turn's stop scan
 * left (work deferred with no [COVERAGE CHECK]) as a one-line retrospective.
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
  const pending = Array.isArray(st.pending) ? st.pending : [];
  st.pending = [];
  const parts = signals.partsOf(data.prompt);
  st.parts = parts; // read at the close: a report turn (signals.reportTurn)
  state.save(HOST, sid, st);

  const out = [];
  if (st.turns === 1) out.push(msg.LOAD);
  if (parts >= signals.PARTS_MIN) out.push(msg.ledger(parts));
  if (pending.length) out.push(msg.retrospective(pending, st.raised));

  logEvent(cwdOf(data), { event: 'prompt', session: sid, turn: st.turns, parts: parts, ledger: parts >= signals.PARTS_MIN, retrospective: pending.length });
  if (out.length) process.stdout.write(context('UserPromptSubmit', out.join('\n')));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
