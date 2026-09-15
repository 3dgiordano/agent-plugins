#!/usr/bin/env node
/*
 * Persistence self-monitoring - Claude Code PostToolUse hook (all tools).
 *
 * One hook for every tool call: records it into the turn's counters
 * (lib/signals.js) and, only when a threshold is crossed, injects a nudge
 * that carries the actual count -- the "feeling" the agent does not have.
 *
 * Output: JSON with hookSpecificOutput.additionalContext (non-blocking).
 * Fails silent: never blocks or alters the tool result.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const msg = require('../lib/messages.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';

  const st = state.load(HOST, sid);
  if (!st.turn) st.turn = signals.freshTurn();

  const out = data.tool_output !== undefined ? data.tool_output : data.tool_response;
  const fired = signals.observe(st.turn, data.tool_name, data.tool_input, out);
  state.save(HOST, sid, st);

  if (!fired.length) return;
  logEvent(data.cwd, { event: 'signal', session: sid, tools: st.turn.tools, signals: fired });
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg.nudge(fired) }
  }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
