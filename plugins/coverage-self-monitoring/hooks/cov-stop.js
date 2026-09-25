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
const misread = require('../lib/misread.js');

const HOST = 'claude';
const MAX_DISPUTED = 32;

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
  const turn = st.turn || signals.freshTurn();
  const disputed = Array.isArray(st.disputed) ? st.disputed : [];
  const report = signals.reportTurn(st.parts, turn);
  const res = signals.scanClose(data.last_assistant_message || '', { report, disputed });

  /*
   * A misread line is taken only for a phrase the scan raised: the one the
   * previous turn's reminder quoted (st.raised), or one in this same message.
   * A taken dispute silences that phrase for the session (MAX_DISPUTED of
   * them), goes to the user as a notice, and - for the maintainer only, with
   * COVMON_MISREAD_LOG set - to the misread log (lib/misread.js).
   */
  const taken = subagent ? [] : signals.disputes(res.misreads, (Array.isArray(st.raised) ? st.raised : []).concat(res.found));

  logEvent(cwdOf(data), Object.assign({
    event: subagent ? 'subagent_stop' : 'stop', session: sid, agent: data.agent_type || null, turn: st.turns || 0, deferrals: res.deferrals, blocks: res.blocks,
    parts: res.parts, violations: res.violations, misreads: taken.map((d) => d.phrase)
  }, signals.summary(turn)));

  if (!subagent) {
    if (taken.length) st.disputed = [...new Set(disputed.concat(taken.map((d) => signals.phraseKey(d.phrase))))].slice(-MAX_DISPUTED);
    misread.record(misread.readings(res, st.raised, report));
    // What the next reminder quotes, and what a dispute on the next turn may answer.
    st.raised = res.violations.length ? res.found : [];
    st.pending = res.violations;
    state.save(HOST, sid, st);
  }
  // The finding reaches the user now, the model on the next prompt (lib/host.js).
  const notes = [];
  if (taken.length) notes.push(msg.disputeNotice(taken));
  if (res.violations.length && !subagent) notes.push(msg.notice(res.violations));
  if (notes.length && notices()) process.stdout.write(context('Stop', '', notes.join('\n')));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
