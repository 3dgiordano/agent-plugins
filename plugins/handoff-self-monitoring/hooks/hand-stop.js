#!/usr/bin/env node
/*
 * Handoff self-monitoring - Claude Code Stop hook (the handoff gate).
 *
 * The Stop is the only event that sees the final message, so this is where
 * the scan runs: lib/handoff.js reads the turn's last assistant message for
 * a decision named but not handed off (an offer, a fork, a closing question,
 * a `returned` coverage part) and for the [HANDOFF] block the skill asks for.
 * No hit and no block = nothing to judge.
 *
 * Default (non-strict): records the result -- to the opt-in log and to
 * session state, so the next prompt carries a one-line retrospective -- and
 * shows the user the finding as a one-line notice (systemMessage). Run
 * this mode first: it measures how often a close names a decision without
 * formulating it before anyone decides a blocking gate is worth its cost.
 * One finding blocks once in this mode too: a blocked close in a turn whose
 * search found nothing.
 *
 * Strict (env HANDMON_STRICT truthy): blocks the stop once per turn (exit 2
 * with the reason on stderr) so the agent writes the block before finishing.
 * `stop_hook_active` guards against re-blocking the continuation.
 *
 * Fails silent: any error lets the stop proceed.
 */
'use strict';

const { logEvent, strict, notices } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const { scan, closedBlocked } = require('../lib/handoff.js');
const msg = require('../lib/messages.js');
const { cwdOf, context, actorOf } = require('../lib/host.js');

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

  const res = scan(data.last_assistant_message || '');
  // Each close is measured on its own actor's turn (hand-observe.js).
  const actor = actorOf(data);
  const st = state.load(HOST, sid, actor);
  // A blocked close in a turn whose search found nothing: the limit may be
  // only that gap. Read off the turn's own signal, not the block's words. It
  // blocks once in either mode: in a one-turn task the next prompt that would
  // carry the finding never comes, and the agent whose request names what was
  // not found keeps blocked on its next close.
  const onNothing = closedBlocked(res, data.last_assistant_message) && Boolean(st.turn && st.turn.fired && st.turn.fired.empty);
  if (onNothing) res.violations.push(msg.blockedOnNothing());
  const blocking = (strict() ? res.violations.length > 0 : onNothing) && !data.stop_hook_active && !subagent;

  logEvent(cwdOf(data), Object.assign({
    event: subagent ? 'subagent_stop' : 'stop', session: sid, actor, agent: data.agent_type || null, hits: res.hits, blocks: res.blocks, status: res.status,
    violations: res.violations, strict: strict(), blocked: blocking
  }, signals.summary(st.turn || signals.freshTurn())));

  if (res.violations.length && !blocking && !subagent) {
    st.pending = res.violations;
    state.save(HOST, sid, st);
  }
  // The finding reaches the user now, the model on the next prompt (lib/host.js).
  if (res.violations.length && !blocking && !subagent && notices()) process.stdout.write(context('Stop', '', msg.notice(res.violations)));

  if (blocking) {
    process.stderr.write(msg.blockReason(res.violations));
    process.exitCode = 2;
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
