#!/usr/bin/env node
/*
 * Epistemic self-monitoring - Cursor postToolUse hook.
 *
 * Same job as the Claude Code PostToolUse adapter: right after a shell
 * observation, inject the expectation-vs-observation nudge with a low cadence
 * (every Nth shell command, or on failure-looking output, rate-limited).
 *
 * Cursor's postToolUse has no tool-name matcher in hooks.json, so this script
 * filters itself: only tools whose name looks like a shell/terminal count.
 *
 * Output: JSON with `additional_context` (non-blocking). Fails silent.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const msg = require('../lib/messages.js');

const EVERY_N_COMMANDS = 6;
const MIN_GAP_ON_ERROR = 3;
const HOST = 'cursor';

const SHELL_TOOL_RE = /shell|terminal|bash|command|exec/i;
const ERROR_RE = /exit code [1-9]|\berror\b|\bfailed\b|\bexception\b|traceback/i;

function workspaceOf(data) {
  if (Array.isArray(data.workspace_roots) && data.workspace_roots[0]) return data.workspace_roots[0];
  return process.env.CURSOR_PROJECT_DIR || process.cwd();
}

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  if (!SHELL_TOOL_RE.test(String(data.tool_name || ''))) return;
  const cid = data.conversation_id || 'noconversation';

  const st = state.load(HOST, cid);
  st.shell = (st.shell || 0) + 1;
  st.sinceNudge = (st.sinceNudge === undefined ? MIN_GAP_ON_ERROR : st.sinceNudge) + 1; // first error of a session fires

  const out = typeof data.tool_output === 'string' ? data.tool_output : JSON.stringify(data.tool_output || '');
  const looksFailed = ERROR_RE.test(out.slice(0, 4000));
  const fire = st.shell % EVERY_N_COMMANDS === 0 || (looksFailed && st.sinceNudge >= MIN_GAP_ON_ERROR);
  if (fire) st.sinceNudge = 0;
  state.save(HOST, cid, st);

  logEvent(workspaceOf(data), { event: 'observe', host: 'cursor', conversation: cid, shell: st.shell, failed: looksFailed, emitted: fire });
  if (fire) process.stdout.write(JSON.stringify({ additional_context: msg.OBSERVE }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
