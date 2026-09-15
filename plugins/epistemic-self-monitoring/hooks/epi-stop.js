#!/usr/bin/env node
/*
 * Epistemic self-monitoring - Claude Code Stop hook (the closure gate).
 *
 * Scans the turn's final assistant message for [EPISTEMIC CLOSE] blocks and
 * checks the closure rules (conjecture needs a falsifier, verified needs
 * "Verified by", every block needs a scope). No block = nothing to judge.
 *
 * Default (non-strict): only records the result -- to the opt-in log and to
 * session state, so the next prompt carries a one-line retrospective. This is
 * the mode to run first: it measures how often closures come out unverified
 * before anyone decides a blocking gate is worth its cost.
 *
 * Strict (env EPIMON_STRICT truthy): blocks the stop once per turn (exit 2 with
 * the reason on stderr) so the agent fixes the block before finishing.
 * `stop_hook_active` guards against re-blocking the continuation.
 *
 * Fails silent: any error lets the stop proceed.
 */
'use strict';

const { logEvent, strict } = require('../lib/log.js');
const state = require('../lib/state.js');
const { scan } = require('../lib/scan.js');
const msg = require('../lib/messages.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';

  const res = scan(data.last_assistant_message || '');
  const blocking = strict() && res.violations.length > 0 && !data.stop_hook_active;

  logEvent(cwdOf(data), {
    event: 'close', session: sid, blocks: res.blocks, tags: res.tags,
    violations: res.violations, strict: strict(), blocked: blocking
  });

  if (res.violations.length && !blocking) {
    const st = state.load(HOST, sid);
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
