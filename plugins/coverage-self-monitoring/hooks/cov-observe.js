#!/usr/bin/env node
/*
 * Coverage self-monitoring - Claude Code PostToolUse hook (all tools).
 *
 * Counts the stub / placeholder / TODO markers each edit introduces (what was
 * written minus what it replaced) into the turn's counters (lib/signals.js)
 * and, only when the threshold is crossed, injects a nudge that carries the
 * count and the files: each marker is a part of the request that is not done.
 *
 * Output: JSON with hookSpecificOutput.additionalContext (non-blocking).
 * Fails silent: never blocks or alters the tool result.
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

  const out = data.tool_response !== undefined ? data.tool_response : data.tool_output;
  let st;
  const fired = state.update(HOST, sid, (s) => {
    st = s;
    if (!st.turn) st.turn = signals.freshTurn();
    return signals.observe(st.turn, data.tool_name, data.tool_input, out);
  });

  if (!fired.length) return;
  logEvent(cwdOf(data), { event: 'signal', session: sid, stubs: st.turn.stubs, signals: fired });
  process.stdout.write(context('PostToolUse', msg.nudge(fired), notices() && msg.stubNotice(fired)));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
