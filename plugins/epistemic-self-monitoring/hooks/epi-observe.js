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
const { outputText, looksFailed } = require('../lib/fail.js');
const { cwdOf, context } = require('../lib/host.js');

const EVERY_N_COMMANDS = 6;   // nudge on every Nth shell command
const MIN_GAP_ON_ERROR = 3;   // and on error output, but not more often than this
const HOST = 'claude';

function outputOf(data) {
  return outputText(data.tool_output !== undefined ? data.tool_output : data.tool_response);
}

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';

  const failed = looksFailed(outputOf(data).slice(0, 4000));
  let st;
  const fire = state.update(HOST, sid, (s) => {
    st = s;
    st.shell = (st.shell || 0) + 1;
    st.sinceNudge = (st.sinceNudge === undefined ? MIN_GAP_ON_ERROR : st.sinceNudge) + 1; // first error of a session fires
    const f = st.shell % EVERY_N_COMMANDS === 0 || (failed && st.sinceNudge >= MIN_GAP_ON_ERROR);
    if (f) st.sinceNudge = 0;
    return f;
  });

  logEvent(cwdOf(data), { event: 'observe', session: sid, shell: st.shell, failed: failed, emitted: fire });
  if (!fire) return;

  process.stdout.write(context('PostToolUse', msg.OBSERVE));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
