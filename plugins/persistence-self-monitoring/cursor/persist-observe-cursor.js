#!/usr/bin/env node
/*
 * Persistence self-monitoring - Cursor postToolUse hook (all tools).
 *
 * Same job as the Claude Code PostToolUse adapter: record the call into the
 * turn's counters and, only when a threshold is crossed, inject a nudge with
 * the actual count via `additional_context`. Cursor's tool names differ from
 * Claude Code's, so lib/signals.js matches them by pattern (edit_file,
 * run_terminal_cmd, ...) rather than by exact name.
 *
 * Fails silent; emits nothing unless a signal fired.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const msg = require('../lib/messages.js');

const HOST = 'cursor';

function workspaceOf(data) {
  if (Array.isArray(data.workspace_roots) && data.workspace_roots[0]) return data.workspace_roots[0];
  return process.env.CURSOR_PROJECT_DIR || process.cwd();
}

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';

  const st = state.load(HOST, cid);
  if (!st.turn) st.turn = signals.freshTurn();

  const fired = signals.observe(st.turn, data.tool_name, data.tool_input, data.tool_output);
  state.save(HOST, cid, st);

  if (!fired.length) return;
  logEvent(workspaceOf(data), { event: 'signal', host: 'cursor', conversation: cid, tools: st.turn.tools, signals: fired });
  process.stdout.write(JSON.stringify({ additional_context: msg.nudge(fired) }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
