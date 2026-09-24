#!/usr/bin/env node
/*
 * Coverage self-monitoring - Claude Code Stop hook (measurement, never blocks).
 *
 * Scans the turn's final assistant message for deferred work ("in a
 * follow-up", "left as a TODO", "simplified version", "still needs") and for
 * the [COVERAGE CHECK] block that should close each part. Findings go to the
 * opt-in log and to session state, so the next prompt carries a one-line
 * retrospective; the user sees them now, as a one-line notice. Also logs the turn's stub count for threshold tuning.
 *
 * There is no strict mode: a wrong "you deferred X" is cheap to ignore on the
 * next prompt and expensive as a blocked stop.
 *
 * Fails silent: any error lets the stop proceed.
 */
'use strict';

const { logEvent, notices } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const msg = require('../lib/messages.js');
const { cwdOf, context } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';

  // SubagentStop carries the same last_assistant_message as Stop, but a
  // subagent has no "next user prompt" for a retrospective to ride on:
  // parking `pending` here would deliver a SUBAGENT's close to the parent's
  // next turn, misattributing it. And blocking a subagent's stop stalls the
  // parent that is waiting on it. So a subagent close is measured and nothing
  // else - which is the order this collection prescribes anyway: find out how
  // often it happens before deciding a gate is worth its cost.
  const subagent = data.hook_event_name === 'SubagentStop';

  const st = state.load(HOST, sid);
  const res = signals.scanClose(data.last_assistant_message || '');

  logEvent(cwdOf(data), Object.assign({
    event: subagent ? 'subagent_stop' : 'stop', session: sid, agent: data.agent_type || null, turn: st.turns || 0, deferrals: res.deferrals, blocks: res.blocks,
    parts: res.parts, violations: res.violations
  }, signals.summary(st.turn || signals.freshTurn())));

  if (res.violations.length && !subagent) {
    st.pending = res.violations;
    state.save(HOST, sid, st);
  }
  // The finding reaches the user now, the model on the next prompt (lib/host.js).
  if (res.violations.length && !subagent && notices()) process.stdout.write(context('Stop', '', msg.notice(res.violations)));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
