#!/usr/bin/env node
/*
 * executive self-monitoring - Claude Code (and Codex) SubagentStop hook.
 *
 * A subagent got the skill at its start (hooks/exec-inject.js) and kept its
 * document reads apart from the main agent's (hooks/exec-observe.js). At its
 * close two things happen:
 *
 *   - its final message is read for the [PLAN CHECK] block (lib/plan.js) and,
 *     with the number of documents it read, written to the opt-in log.
 *     Measured only, like every subagent close in this collection: a subagent
 *     has no next prompt for a reminder to ride on, and blocking its stop
 *     stalls the agent waiting on it.
 *   - its reads are dropped. Only the main agent's next prompt compares reads
 *     with the disk (hooks/exec-monitor.js); a subagent that ended has no
 *     prompt left, so its record would only wait for the week's sweep.
 *
 * Emits nothing, never blocks, fails silent.
 */
'use strict';

const fs = require('fs');
const { logEvent, enabled } = require('../lib/execlog.js');
const reads = require('../lib/reads.js');
const { scan } = require('../lib/plan.js');
const { cwdOf, actorOf, MAIN_ACTOR } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const actor = actorOf(data);
  if (actor === MAIN_ACTOR) return; // the main agent's record is not this hook's to drop
  const sid = data.session_id || 'nosession';
  const file = reads.file(HOST, sid, actor);

  if (enabled()) {
    let read = 0;
    try { read = Object.keys((JSON.parse(fs.readFileSync(file, 'utf8')) || {}).files || {}).length; } catch (_) {}
    const res = scan(data.last_assistant_message || '');
    logEvent(cwdOf(data), {
      event: 'subagent_stop', session: sid, actor, agent: data.agent_type || null,
      reads: read, blocks: res.blocks, decision: res.decision || null, violations: res.violations
    });
  }
  try { fs.rmSync(file, { force: true }); } catch (_) {}
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
