#!/usr/bin/env node
/*
 * Integrity self-monitoring - Claude Code / Codex Stop and SubagentStop hook
 * (measurement, never blocks).
 *
 * Reads the close for the [INTEGRITY CHECK] block and for a dispute - a line
 * `- <file>: misread - <why>` that answers a finding raised this session.
 * A dispute goes to the user as one line, since only the user knows whether
 * the finding is what they asked for; that finding is not raised again this
 * session. Both go to the opt-in log, where they can be read beside the
 * run's own record of what it did.
 *
 * Nothing goes back to the agent here: no retrospective, no block.
 * A subagent's close is logged only - its findings belong to the parent's turn.
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
  const subagent = data.hook_event_name === 'SubagentStop';
  const text = data.last_assistant_message || '';

  let taken = [];
  let raisedCount = 0;
  state.update(HOST, sid, (st) => {
    const raised = Array.isArray(st.raised) ? st.raised : [];
    raisedCount = raised.length;
    if (subagent) return;
    taken = signals.disputes(text, raised);
    if (taken.length) {
      st.disputed = [...new Set((st.disputed || []).concat(taken.map((d) => d.key)))].slice(-signals.MAX_RAISED);
      st.raised = raised.filter((x) => !taken.some((d) => d.key === x.key));
    }
  });

  const b = signals.block(text);
  logEvent(cwdOf(data), {
    event: subagent ? 'subagent_stop' : 'stop', session: sid, agent: data.agent_type || null,
    raised: raisedCount, block: b, disputes: taken,
  });
  if (taken.length && notices()) process.stdout.write(context('Stop', '', msg.disputeNotice(taken)));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
