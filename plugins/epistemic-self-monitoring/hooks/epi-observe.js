#!/usr/bin/env node
/*
 * Epistemic self-monitoring - Claude Code PostToolUse hook (matcher: the
 * tools whose result is a command's output, SHELL_TOOLS below).
 *
 * The moment right after an observation is where a first explanation forms.
 *
 * The host names the tool, not the shell: on macOS and Linux zsh or bash runs
 * inside Claude Code's Bash tool, and Codex reports every shell command as
 * Bash. PowerShell is Claude Code's other shell tool (on by default on
 * Windows, opt-in on macOS and Linux with pwsh); Monitor runs a command in the
 * background and hands its output back line by line. BashOutput and
 * TaskOutput read a background command's output in older Claude Code versions
 * (TaskOutput was removed in 2.1.277; a background task's output file is now
 * read with Read, which this hook does not watch). The matcher in
 * hooks.json names the same tools; the check here keeps a looser matcher (a
 * regex that also matches a longer name) from bringing in another tool.
 * This hook injects the expectation-vs-observation nudge when a shell
 * command's output looks like a failure (lib/fail.js), rate-limited so a
 * burst of errors does not become wallpaper. A command that went as planned
 * draws nothing: a nudge after every few commands, whatever they showed, was
 * one the agent learned to read past.
 *
 * A result that comes after a claim the agent marked as a conjecture - in
 * this turn's text, or in the previous turn's close - draws the claim nudge
 * instead, once per mark (lib/conjecture.js): whether or not the command
 * failed, it is the result that can test the claim.
 *
 * Output: JSON with hookSpecificOutput.additionalContext (non-blocking).
 * Fails silent: never blocks or alters the tool result.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const msg = require('../lib/messages.js');
const { outputText, looksFailed } = require('../lib/fail.js');
const conjecture = require('../lib/conjecture.js');
const { cwdOf, context, actorOf } = require('../lib/host.js');

const MIN_GAP_ON_ERROR = 3;   // nudge on error output, but not more often than this
const SHELL_TOOLS = /^(?:Bash|PowerShell|Monitor|BashOutput|TaskOutput)$/;
const HOST = 'claude';

function outputOf(data) {
  return outputText(data.tool_output !== undefined ? data.tool_output : data.tool_response);
}

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  if (data.tool_name !== undefined && !SHELL_TOOLS.test(String(data.tool_name))) return;
  const sid = data.session_id || 'nosession';
  // Each actor keeps its own cadence: a subagent's commands neither spend nor
  // fill the main agent's, and its nudge goes to the subagent that ran them.
  const actor = actorOf(data);

  const failed = looksFailed(outputOf(data).slice(0, 4000));
  const marked = conjecture.latestMarked(conjecture.transcriptOf(data, actor));
  let st;
  const fire = state.update(HOST, sid, (s) => {
    st = s;
    st.shell = (st.shell || 0) + 1;
    st.sinceNudge = (st.sinceNudge === undefined ? MIN_GAP_ON_ERROR : st.sinceNudge) + 1; // first error of a session fires
    if ((marked && marked !== st.conjSeen) || st.carry) {
      if (marked) st.conjSeen = marked;
      st.carry = false;
      st.sinceNudge = 0;
      return 'claim';
    }
    const f = failed && st.sinceNudge >= MIN_GAP_ON_ERROR;
    if (f) st.sinceNudge = 0;
    return f ? 'failure' : null;
  }, actor);

  logEvent(cwdOf(data), { event: 'observe', session: sid, actor, shell: st.shell, failed: failed, emitted: !!fire, kind: fire || null });
  if (!fire) return;

  process.stdout.write(context('PostToolUse', fire === 'claim' ? msg.CLAIM : msg.OBSERVE));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
