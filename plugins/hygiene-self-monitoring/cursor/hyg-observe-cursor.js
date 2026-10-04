#!/usr/bin/env node
/*
 * Hygiene self-monitoring - Cursor postToolUse hook.
 *
 * The same record as the Claude Code hook (lib/signals.js): a read sets a
 * file's baseline, an edit compares the file with it. When the edits have
 * reached two or more public functions and the set just grew, says how many
 * and where via `additional_context` - the path and the lines, never the
 * names or the code - at most three times a conversation.
 *
 * Never blocks, fails silent.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const msg = require('../lib/messages.js');
const { cwdOf } = require('../lib/host.js');
const { workspaceId, adopt } = require('../lib/workspace.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';
  const cwd = cwdOf(data);
  const baseline = cwd ? state.load(HOST, workspaceId(cwd)) : null;
  let res = { kind: null };
  let due = 0;
  let groups = [];
  state.update(HOST, cid, (st) => {
    adopt(st, baseline);
    res = signals.observe(st, cwd, data.tool_name, data.tool_input);
    if (res.kind === 'edit') {
      due = signals.nudgeDue(st, res.grew);
      groups = signals.reachedAll(st);
    }
  });
  if (!res.kind) return;
  logEvent(cwd, { event: 'observe', host: 'cursor', conversation: cid, kind: res.kind, reached: groups.length, nudge: due > 0 });
  if (due) process.stdout.write(JSON.stringify({ additional_context: msg.nudge(due, msg.where(groups)) }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
