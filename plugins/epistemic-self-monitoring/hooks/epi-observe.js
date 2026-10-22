#!/usr/bin/env node
/*
 * Epistemic self-monitoring - Claude Code PostToolUse hook (matcher: Bash).
 *
 * The moment right after an observation is where a first explanation forms.
 * This hook injects the expectation-vs-observation nudge when a shell
 * command's output looks like a failure (lib/fail.js), rate-limited so a
 * burst of errors does not become wallpaper. A command that went as planned
 * draws nothing: a nudge after every few commands, whatever they showed, was
 * one the agent learned to read past.
 *
 * Output: JSON with hookSpecificOutput.additionalContext (non-blocking).
 * Fails silent: never blocks or alters the tool result.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const msg = require('../lib/messages.js');
const { outputText, looksFailed } = require('../lib/fail.js');
const { cwdOf, context, actorOf } = require('../lib/host.js');

const MIN_GAP_ON_ERROR = 3;   // nudge on error output, but not more often than this
const HOST = 'claude';

function outputOf(data) {
  return outputText(data.tool_output !== undefined ? data.tool_output : data.tool_response);
}

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  // Each actor keeps its own cadence: a subagent's commands neither spend nor
  // fill the main agent's, and its nudge goes to the subagent that ran them.
  const actor = actorOf(data);

  const failed = looksFailed(outputOf(data).slice(0, 4000));
  let st;
  const fire = state.update(HOST, sid, (s) => {
    st = s;
    st.shell = (st.shell || 0) + 1;
    st.sinceNudge = (st.sinceNudge === undefined ? MIN_GAP_ON_ERROR : st.sinceNudge) + 1; // first error of a session fires
    const f = failed && st.sinceNudge >= MIN_GAP_ON_ERROR;
    if (f) st.sinceNudge = 0;
    return f;
  }, actor);

  logEvent(cwdOf(data), { event: 'observe', session: sid, actor, shell: st.shell, failed: failed, emitted: fire });
  if (!fire) return;

  process.stdout.write(context('PostToolUse', msg.OBSERVE));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
