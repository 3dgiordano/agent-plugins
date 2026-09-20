#!/usr/bin/env node
/*
 * Progress self-monitoring - Cursor afterAgentResponse hook (turn boundary).
 *
 * Cursor has no non-blocking per-prompt event, so the turn boundary is the
 * end of the agent's response: compare the turn's counters with the ledger
 * on disk, log whether the turn left it stale, and reset for the next turn.
 *
 * Cursor also has no non-blocking injection point after this, so the finding
 * is logged only - there is no retrospective on this host, and this plugin
 * has no strict gate to deliver one through. Observe-only; emits nothing.
 * Fails silent.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const ledger = require('../lib/ledger.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';
  const cwd = cwdOf(data);

  const ins = ledger.inspect(cwd);
  let res = { stale: false, fire: false };
  let turn = null;
  let turns = 0;
  state.update(HOST, cid, (st) => {
    st.turns = (st.turns || 0) + 1;
    turns = st.turns;
    turn = st.turn || signals.freshTurn();
    res = signals.stale(turn, ins, st.turnStart, st.flagged);
    if (res.fire) st.flagged = ins.mtimeMs;
    st.turn = signals.freshTurn();
    st.turnStart = Date.now();
  });

  logEvent(cwd, Object.assign({
    event: 'stop', host: 'cursor', conversation: cid, turn: turns,
    exists: ins.exists, open: ins.open, ageMs: ins.ageMs, stale: res.stale, fired: res.fire
  }, signals.summary(turn)));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
