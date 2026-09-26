#!/usr/bin/env node
/*
 * Integrity self-monitoring - Claude Code / Codex PostToolUse hook (all tools).
 *
 * After an edit, reads the product file as it now is and asks whether the
 * edit brought in code that answers with a value of its own where a service,
 * a key or a computation was asked for (lib/code.js); after a shell command,
 * whether it changed the machine or started a server (lib/commands.js). A
 * finding new this session goes to the agent with what it means for the
 * user, and to the user as one line. A path outside the project is logged,
 * not said.
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
const { ownRoots } = require('../lib/roots.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  const cwd = cwdOf(data);

  const out = data.tool_response !== undefined ? data.tool_response : data.tool_output;
  const r = state.update(HOST, sid, (st) => signals.observe(st, data.tool_name, data.tool_input, out, cwd, ownRoots()));

  if (r.said.length || r.logged.length) logEvent(cwd, { event: 'signal', session: sid, tool: data.tool_name || null, said: r.said, logged: r.logged });
  if (r.outside.length) logEvent(cwd, { event: 'outside', session: sid, tool: data.tool_name || null, paths: r.outside });
  if (!r.said.length) return;
  process.stdout.write(context('PostToolUse', msg.nudge(r.said), notices() && msg.notice(r.said)));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
