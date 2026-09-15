#!/usr/bin/env node
/*
 * Epistemic self-monitoring - Claude Code PostToolUse hook (matcher: Bash).
 *
 * The moment right after an observation is where a first explanation forms.
 * This hook injects the expectation-vs-observation nudge with a low cadence:
 * every Nth shell command, or immediately when the output looks like a failure
 * (rate-limited so a burst of errors does not become wallpaper).
 *
 * Output: JSON with hookSpecificOutput.additionalContext (non-blocking).
 * Fails silent: never blocks or alters the tool result.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const msg = require('../lib/messages.js');

const EVERY_N_COMMANDS = 6;   // nudge on every Nth shell command
const MIN_GAP_ON_ERROR = 3;   // and on error output, but not more often than this
const HOST = 'claude';

const ERROR_RE = /exit code [1-9]|\berror\b|\bfailed\b|\bexception\b|traceback/i;

function outputText(data) {
  const o = data.tool_output !== undefined ? data.tool_output : data.tool_response;
  if (typeof o === 'string') return o;
  try { return JSON.stringify(o || ''); } catch (_) { return ''; }
}

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';

  const st = state.load(HOST, sid);
  st.shell = (st.shell || 0) + 1;
  st.sinceNudge = (st.sinceNudge === undefined ? MIN_GAP_ON_ERROR : st.sinceNudge) + 1; // first error of a session fires

  const looksFailed = ERROR_RE.test(outputText(data).slice(0, 4000));
  const fire = st.shell % EVERY_N_COMMANDS === 0 || (looksFailed && st.sinceNudge >= MIN_GAP_ON_ERROR);
  if (fire) st.sinceNudge = 0;
  state.save(HOST, sid, st);

  logEvent(data.cwd, { event: 'observe', session: sid, shell: st.shell, failed: looksFailed, emitted: fire });
  if (!fire) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg.OBSERVE }
  }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
