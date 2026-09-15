#!/usr/bin/env node
/*
 * Persistence self-monitoring - Claude Code Stop hook (measurement only).
 *
 * Never blocks. Writes a one-line summary of the turn to the opt-in log --
 * tool calls, the highest edit count on a single file, the most-repeated
 * failing command and error -- so the thresholds can be tuned against real
 * sessions instead of guessed. Emits nothing to the agent.
 *
 * Fails silent: any error lets the stop proceed.
 */
'use strict';

const { logEvent, enabled } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');

const HOST = 'claude';

function main(raw) {
  if (!enabled()) return; // nothing to do when not logging
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  const st = state.load(HOST, sid);
  logEvent(data.cwd, Object.assign({ event: 'turn', session: sid, turn: st.turns || 0 }, signals.summary(st.turn || signals.freshTurn())));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
