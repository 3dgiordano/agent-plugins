#!/usr/bin/env node
/*
 * Integrity self-monitoring - Cursor postToolUse hook (all tools).
 *
 * Same job as the Claude Code adapter: after an edit, read the product file
 * as it now is for code that answers with a value of its own; after a shell
 * command, look for a change to the machine or a server started. Cursor
 * sends no copy of the file before the edit, so what is new is read off the
 * lines the edit wrote (its diff, or its text).
 *
 * This is the only point where the finding reaches the agent on Cursor: a
 * headless run fires no hook at the close.
 *
 * Fails silent; emits nothing unless a signal fired.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const msg = require('../lib/messages.js');
const { cwdOf } = require('../lib/host.js');
const { ownRoots } = require('../lib/roots.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';
  const cwd = cwdOf(data);

  const out = data.tool_response !== undefined ? data.tool_response : data.tool_output;
  let fresh = false;
  const r = state.update(HOST, cid, (st) => { fresh = !st.seen; return signals.observe(st, data.tool_name, data.tool_input, out, cwd, ownRoots()); });
  // Cursor has no session-end event, and this plugin wires no sessionStart:
  // the first call of a conversation sweeps what aged ones left behind.
  if (fresh) state.sweep();

  if (r.said.length || r.logged.length) logEvent(cwd, { event: 'signal', host: 'cursor', conversation: cid, tool: data.tool_name || null, said: r.said, logged: r.logged });
  if (r.outside.length) logEvent(cwd, { event: 'outside', host: 'cursor', conversation: cid, tool: data.tool_name || null, paths: r.outside });
  if (!r.said.length) return;
  process.stdout.write(JSON.stringify({ additional_context: msg.nudge(r.said) }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
