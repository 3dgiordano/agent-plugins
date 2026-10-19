#!/usr/bin/env node
/*
 * Persistence self-monitoring - Claude Code Stop and SubagentStop hook
 * (measurement only).
 *
 * Never blocks. Writes a one-line summary of the turn to the opt-in log --
 * tool calls, the highest edit count on a single file, the most-repeated
 * failing command and error -- so the thresholds can be tuned against real
 * sessions instead of guessed. Emits nothing to the agent. A subagent's close
 * is summarised from its own turn; what it counted joins the main agent's turn
 * when it hands back (hooks/persist-observe.js).
 *
 * Fails silent: any error lets the stop proceed.
 */
'use strict';

const { logEvent, enabled } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const { cwdOf, actorOf } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  if (!enabled()) return; // nothing to do when not logging
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  const subagent = data.hook_event_name === 'SubagentStop';
  const actor = actorOf(data);
  const st = state.load(HOST, sid, actor);
  logEvent(cwdOf(data), Object.assign(subagent
    ? { event: 'subagent_turn', session: sid, actor, agent: data.agent_type || null }
    : { event: 'turn', session: sid, actor, turn: st.turns || 0 }, signals.summary(st.turn || signals.freshTurn())));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
