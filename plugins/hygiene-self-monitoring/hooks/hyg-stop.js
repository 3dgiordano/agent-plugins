#!/usr/bin/env node
/*
 * Hygiene self-monitoring - Claude Code (and Codex) Stop hook.
 *
 * Reads the final message's [HYGIENE CHECK] against the session's edit record
 * (lib/block.js): a close with no block after the edits reached two or more
 * public functions; Outside named and kept; Outside none while a public
 * function the edits reached is not in Request names; Outside put back or
 * offered while such a function is still changed. The hook never decides
 * whether a change was right - only whether the block accounts for what the
 * edits reached.
 *
 * Default: park the finding for the next prompt, and show the user one line -
 * except the block's own contradictions - Outside named and kept, or put back
 * or offered while the code still has it - which block the stop once. Strict (HYGMON_STRICT): block the stop once on any finding. A subagent close is measured
 * only - never blocks, never parks.
 *
 * Fails silent: any error lets the stop proceed.
 */
'use strict';

const { logEvent, strict, notices } = require('../lib/log.js');
const state = require('../lib/state.js');
const { scan } = require('../lib/block.js');
const { reachedAll, reachedWith } = require('../lib/signals.js');
const msg = require('../lib/messages.js');
const { cwdOf, context, actorOf } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  const subagent = data.hook_event_name === 'SubagentStop';
  const actor = actorOf(data);

  // A subagent's close is weighed on its own reach (measured only). The main
  // agent's close on its own reach and every subagent's: it ships them all.
  const groups = subagent
    ? reachedAll(state.load(HOST, sid, actor))
    : reachedWith(state.load(HOST, sid), state.actors(HOST, sid).map((a) => state.load(HOST, sid, a)));
  const res = scan(data.last_assistant_message || '', groups);
  // A block that contradicts itself - keeps what its own Outside names, or
  // says it put back what the code still has - holds the close once in either
  // mode: parked for the next prompt, it never reached a one-turn task.
  const blocking = Boolean(strict() ? res.violations.length > 0 : res.contradicts) && !data.stop_hook_active && !subagent;

  logEvent(cwdOf(data), {
    event: subagent ? 'subagent_stop' : 'stop', session: sid, actor, block: res.block, decision: res.decision || null,
    reached: groups.length, bySubagents: groups.filter((g) => g.by === 'subagent').length,
    violations: res.violations.length, strict: strict(), blocked: blocking
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
