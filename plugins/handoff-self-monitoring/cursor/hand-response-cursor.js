#!/usr/bin/env node
/*
 * Handoff self-monitoring - Cursor afterAgentResponse hook (turn boundary).
 *
 * Cursor hands the agent's final text to this event but lets it change
 * nothing, so the stop scan is split in two: this script scans the text with
 * lib/handoff.js, logs the result together with the turn's pre-close state,
 * parks any findings in session state and resets the per-turn counters; the
 * `stop` adapter (hand-stop-cursor.js) then decides whether to act on them.
 *
 * Fails silent; emits nothing.
 */
'use strict';

const { logEvent, strict } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const { scan } = require('../lib/handoff.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';

  const res = scan(data.text || '');
  const st = state.load(HOST, cid);
  st.turns = (st.turns || 0) + 1;
  logEvent(cwdOf(data), Object.assign({
    event: 'stop', host: 'cursor', conversation: cid, turn: st.turns, hits: res.hits, blocks: res.blocks,
    status: res.status, violations: res.violations, strict: strict()
  }, signals.summary(st.turn || signals.freshTurn())));

  st.pending = res.violations; // replaced every response; consumed by the stop adapter
  st.turn = signals.freshTurn();
  state.save(HOST, cid, st);
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
