#!/usr/bin/env node
/*
 * Coverage self-monitoring - Claude Code Stop hook (measurement, never blocks).
 *
 * Scans the turn's final assistant message for deferred work ("in a
 * follow-up", "left as a TODO", "simplified version", "still needs") and for
 * the [COVERAGE CHECK] block that should close each part. Findings go to the
 * opt-in log and to session state, so the next prompt carries a one-line
 * retrospective. Also logs the turn's stub count for threshold tuning.
 *
 * There is no strict mode: a wrong "you deferred X" is cheap to ignore on the
 * next prompt and expensive as a blocked stop.
 *
 * Fails silent: any error lets the stop proceed.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';

  const st = state.load(HOST, sid);
  const res = signals.scanClose(data.last_assistant_message || '');

  logEvent(cwdOf(data), Object.assign({
    event: 'stop', session: sid, turn: st.turns || 0, deferrals: res.deferrals, blocks: res.blocks,
    parts: res.parts, violations: res.violations
  }, signals.summary(st.turn || signals.freshTurn())));

  if (res.violations.length) {
    st.pending = res.violations;
    state.save(HOST, sid, st);
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
