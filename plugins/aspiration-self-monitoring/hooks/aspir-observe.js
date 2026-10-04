#!/usr/bin/env node
/*
 * Aspiration self-monitoring - Claude Code PostToolUse hook.
 *
 * Records the turn's edits, and which edited files were not reviewed since
 * their last change (lib/signals.js). Reads the tool's name, the path it
 * names and a command's text, never its output; none of it is emitted. The Stop hook reads the count.
 *
 * Emits nothing, never blocks, fails silent.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const { observe } = signals;
const { cwdOf } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  let kind = null;
  let unreviewed = 0;
  state.update(HOST, sid, (st) => {
    kind = observe(st, data.tool_name, data.tool_input);
    unreviewed = signals.unreviewed(st);
  });
  if (kind) logEvent(cwdOf(data), { event: 'observe', session: sid, kind, unreviewed });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
