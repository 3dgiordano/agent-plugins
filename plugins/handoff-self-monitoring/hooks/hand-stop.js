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
 * Default (non-strict): only records the result -- to the opt-in log and to
 * session state, so the next prompt carries a one-line retrospective. Run
 * this mode first: it measures how often a close names a decision without
 * formulating it before anyone decides a blocking gate is worth its cost.
 *
 * Strict (env HANDMON_STRICT truthy): blocks the stop once per turn (exit 2
 * with the reason on stderr) so the agent writes the block before finishing.
 * `stop_hook_active` guards against re-blocking the continuation.
 *
 * Fails silent: any error lets the stop proceed.
 */
'use strict';

const { logEvent, strict } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const { scan } = require('../lib/handoff.js');
const msg = require('../lib/messages.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';

  const res = scan(data.last_assistant_message || '');
  const blocking = strict() && res.violations.length > 0 && !data.stop_hook_active;

  const st = state.load(HOST, sid);
  logEvent(cwdOf(data), Object.assign({
    event: 'stop', session: sid, hits: res.hits, blocks: res.blocks, status: res.status,
    violations: res.violations, strict: strict(), blocked: blocking
  }, signals.summary(st.turn || signals.freshTurn())));

  if (res.violations.length && !blocking) {
    st.pending = res.violations;
    state.save(HOST, sid, st);
  }

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
