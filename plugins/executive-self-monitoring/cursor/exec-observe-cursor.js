#!/usr/bin/env node
/*
 * Executive self-monitoring - Cursor postToolUse hook.
 *
 * The Claude Code adapter records the documents the agent reads after each
 * tool call (exec-observe.js) and says at the next prompt which of them
 * changed on disk since (exec-monitor.js). Cursor has no prompt hook that can
 * add context - beforeSubmitPrompt can only block - so this says it at the
 * first tool call after the change: the agent gets it with that call's
 * result, before its next step. Same record (lib/reads.js), same line.
 *
 * Each call is recorded first: a Read of a document takes its mtime; any
 * other tool that points at a document read earlier is the agent's own write
 * to it (Cursor's edit tool is not matched by name); a shell command that
 * names it is the agent's own change. Then the documents read earlier that
 * changed since are said, each change once.
 *
 * Cursor's postToolUse has no tool-name matcher in hooks.json, so this script
 * filters itself. Output: JSON with `additional_context` (non-blocking).
 * Fails silent: never blocks or alters the tool result.
 */
'use strict';

const path = require('path');
const reads = require('../lib/reads.js');
const { logEvent } = require('../lib/execlog.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'cursor';
const READ_RE = /^(?:Read|read_file)$/i;
const SHELL_RE = /shell|terminal|bash|command|exec/i;

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || data.session_id || 'noconversation';
  const name = String(data.tool_name || '');
  const input = data.tool_input || {};
  const cwd = cwdOf(data);
  if (READ_RE.test(name)) reads.observe(HOST, cid, 'Read', input, cwd);
  else if (SHELL_RE.test(name)) reads.shellRan(HOST, cid, input.command);
  else reads.touched(HOST, cid, input, cwd);

  const moved = reads.changed(HOST, cid).map((p) => (cwd && !path.relative(cwd, p).startsWith('..') ? path.relative(cwd, p) : p).split(path.sep).join('/'));
  if (!moved.length) return;
  try { logEvent(cwd, { event: 'changed', host: HOST, conversation: cid, changed: moved.length }); } catch (_) {}
  process.stdout.write(JSON.stringify({ additional_context: reads.changedLine(moved) }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
