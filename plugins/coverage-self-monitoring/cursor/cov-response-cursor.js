#!/usr/bin/env node
/*
 * Coverage self-monitoring - Cursor afterAgentResponse hook (turn boundary).
 *
 * Cursor has no non-blocking per-prompt event (beforeSubmitPrompt can block),
 * so the turn boundary is the end of the agent's response: scan the final
 * text for deferred work and the [COVERAGE CHECK] block, log the result
 * together with the turn's stub count, and reset the per-turn counters.
 *
 * Cursor also has no non-blocking injection point after this, so findings
 * are logged only - there is no retrospective on this host. Observe-only;
 * emits nothing. Fails silent.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';

  const st = state.load(HOST, cid);
  st.turns = (st.turns || 0) + 1;
  const res = signals.scanClose(data.text || '');
  logEvent(cwdOf(data), Object.assign({
    event: 'stop', host: 'cursor', conversation: cid, turn: st.turns, deferrals: res.deferrals,
    blocks: res.blocks, parts: res.parts, violations: res.violations
  }, signals.summary(st.turn || signals.freshTurn())));
  st.turn = signals.freshTurn();
  state.save(HOST, cid, st);
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
