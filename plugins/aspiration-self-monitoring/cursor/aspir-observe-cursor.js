#!/usr/bin/env node
/*
 * Aspiration self-monitoring - Cursor postToolUse hook (observe-only).
 *
 * Records the turn's edits, and which edited files were not reviewed since
 * their last change (lib/signals.js). Reads the tool's name, the path it
 * names and a command's text, never its output; none of it is emitted. afterAgentResponse reads the count.
 *
 * Emits nothing, never blocks, fails silent.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const { observe } = signals;
const { cwdOf } = require('../lib/host.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';
  let kind = null;
  let unreviewed = 0;
  state.update(HOST, cid, (st) => {
    kind = observe(st, data.tool_name, data.tool_input);
    unreviewed = signals.unreviewed(st);
  });
  if (kind) logEvent(cwdOf(data), { event: 'observe', host: 'cursor', conversation: cid, kind, unreviewed });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
