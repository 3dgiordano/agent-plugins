#!/usr/bin/env node
/*
 * Aspiration self-monitoring - Claude Code Stop hook.
 *
 * The Stop is where a completion claim gets committed. lib/lexicon.js reads
 * the final message for that claim and for the [ASPIRATION CHECK] block, with
 * the turn's counts from lib/signals.js: how many edits, and how many edited
 * files nobody reviewed since their last change. No claim and no block = nothing to
 * judge. The hook never decides whether the work is good.
 *
 * Default: park the finding for the next prompt, and show the user one line.
 * Strict (ASPMON_STRICT): block the stop once. A subagent close is measured
 * only - never blocks, never parks.
 *
 * Fails silent: any error lets the stop proceed.
 */
'use strict';

const { logEvent, strict, notices } = require('../lib/log.js');
const state = require('../lib/state.js');
const { scan } = require('../lib/lexicon.js');
const msg = require('../lib/messages.js');
const { cwdOf, context } = require('../lib/host.js');
const { unreviewed, looked } = require('../lib/signals.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  const subagent = data.hook_event_name === 'SubagentStop';

  // A subagent's tool calls land in the parent's session state, so its own
  // close is scanned on its words alone.
  const st = subagent ? {} : state.load(HOST, sid);
  const counts = subagent ? {} : { edits: st.edits || 0, unreviewed: unreviewed(st), looked: looked(st, cwdOf(data)) };
  const res = scan(data.last_assistant_message || '', counts);
  const blocking = strict() && res.violations.length > 0 && !data.stop_hook_active && !subagent;

  logEvent(cwdOf(data), {
    event: subagent ? 'subagent_stop' : 'stop', session: sid, agent: data.agent_type || null,
    claims: res.claims, blocks: res.blocks, remainder: res.remainder, edits: counts.edits, unreviewed: counts.unreviewed,
    violations: res.violations, strict: strict(), blocked: blocking
  });

  if (!subagent && !blocking && res.violations.length) {
    state.update(HOST, sid, (s) => { s.pending = res.violations; });
    if (notices()) process.stdout.write(context('Stop', '', msg.notice(res.violations)));
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
