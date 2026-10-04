#!/usr/bin/env node
/*
 * Hygiene self-monitoring - Claude Code (and Codex) PostToolUse hook.
 *
 * Records which public functions the session's edits reached (lib/signals.js):
 * a read of a code file sets its baseline, an edit compares the file with it.
 * When the edits have reached two or more public functions and the set just
 * grew, says how many and where - the path and the lines, never the names or
 * the code - at most three times a session.
 *
 * Never blocks, fails silent.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const msg = require('../lib/messages.js');
const { cwdOf, context } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  const cwd = cwdOf(data);
  let res = { kind: null };
  let due = 0;
  let groups = [];
  state.update(HOST, sid, (st) => {
    res = signals.observe(st, cwd, data.tool_name, data.tool_input);
    if (res.kind === 'edit') {
      due = signals.nudgeDue(st, res.grew);
      groups = signals.reachedAll(st);
    }
  });
  if (!res.kind) return;
  logEvent(cwd, { event: 'observe', session: sid, kind: res.kind, reached: groups.length, nudge: due > 0 });
  if (due) process.stdout.write(context('PostToolUse', msg.nudge(due, msg.where(groups))));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
