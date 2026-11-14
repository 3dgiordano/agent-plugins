#!/usr/bin/env node
/*
 * Epistemic self-monitoring - Claude Code PostToolUse and PostToolUseFailure
 * hook (matcher: the tools whose result is a command's output, SHELL_TOOLS
 * below).
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
const { outputText, looksFailed, failureLine, failureWindow } = require('../lib/fail.js');
const conjecture = require('../lib/conjecture.js');
const { cwdOf, context, actorOf } = require('../lib/host.js');

const MIN_GAP_ON_ERROR = 3;   // nudge on error output, but not more often than this
const SHELL_TOOLS = /^(?:Bash|PowerShell|Monitor|BashOutput|TaskOutput|Execute)$/; // Execute: Droid's shell
const HOST = 'claude';

function outputOf(data) {
  return outputText(data.tool_output !== undefined ? data.tool_output : data.tool_response);
}

/*
 * PostToolUseFailure (Claude Code): a command that ran and exited non-zero
 * never reaches PostToolUse, which fires only for a call that succeeded. Its
 * `error` opens with `Exit code N` for Bash and PowerShell; the rest is the
 * command's output. Exit code 1 is also how a query answers "no": grep with no
 * match, test, diff with a difference - so it counts as a failure only when
 * the output looks like one; 2 and above always do. An abort (is_interrupt)
 * is not the command's result.
 */
const EXIT_LINE = /^Exit code (\d+)\s*(?:\r?\n|$)/;

/*
 * A command that only reads, answering that a path is not there - `ls x`,
 * `cat x`, `grep y x` with "No such file or directory" - looked for something
 * and found out it is absent: an observation, not a failed attempt. The same
 * command rule persistence applies (its lib/signals.js READ_ONLY_RE). The
 * shared lib/fail.js keeps reading the line as a failure: handoff counts it as
 * a search that found nothing.
 */
const READ_ONLY_RE = /^\s*(?:cd\s+[^;&|]+\s*(?:&&|;)\s*)*(?:grep|egrep|rg|cat|head|tail|ls|find|wc|sed\s+-n|git\s+(?:diff|log|show|status|grep|ls-files))\b[^;&]*$/i;
const ABSENT_RE = /\bno such file or directory\b|\bcannot access\b/i;
// Redirections of a stream (2>&1, 2>/dev/null) are not a second command.
const REDIRECT_RE = /\s\d?>&\d\b|\s\d?>\s*\/dev\/null\b/g;
function absenceOnly(data, text) {
  const cmd = data.tool_input && typeof data.tool_input === 'object' ? String(data.tool_input.command || '') : '';
  if (!READ_ONLY_RE.test(cmd.replace(REDIRECT_RE, ' '))) return false;
  const line = failureLine(text);
  return Boolean(line) && ABSENT_RE.test(line);
}
function failureOf(data) {
  if (data.is_interrupt) return null;
  const text = typeof data.error === 'string' ? data.error : outputText(data.error);
  const m = EXIT_LINE.exec(text);
  const rest = m ? text.slice(m[0].length) : text;
  return { text: rest, failed: (m && Number(m[1]) >= 2) || looksFailed(failureWindow(rest)) };
}

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  if (data.tool_name !== undefined && !SHELL_TOOLS.test(String(data.tool_name))) return;
  const sid = data.session_id || 'nosession';
  // Each actor keeps its own cadence: a subagent's commands neither spend nor
  // fill the main agent's, and its nudge goes to the subagent that ran them.
  const actor = actorOf(data);
  const event = data.hook_event_name === 'PostToolUseFailure' ? 'PostToolUseFailure' : 'PostToolUse';
  const failure = event === 'PostToolUseFailure' ? failureOf(data) : null;
  if (event === 'PostToolUseFailure' && !failure) return;

  const text = failureWindow(failure ? failure.text : outputOf(data));
  const failed = (failure ? Boolean(failure.failed) : looksFailed(text)) && !absenceOnly(data, text);
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

  logEvent(cwdOf(data), { event: 'observe', session: sid, actor, hook: event, shell: st.shell, failed: failed, emitted: !!fire, kind: fire || null });
  if (!fire) return;

  process.stdout.write(context(event, fire === 'claim' ? msg.CLAIM : msg.OBSERVE));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
