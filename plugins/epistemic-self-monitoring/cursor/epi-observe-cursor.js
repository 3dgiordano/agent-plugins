#!/usr/bin/env node
/*
 * Epistemic self-monitoring - Cursor postToolUse and postToolUseFailure hook.
 *
 * Same job as the Claude Code PostToolUse adapter: right after a shell
 * observation that looks like a failure, inject the expectation-vs-observation
 * nudge, rate-limited. The first result after a response that marked a
 * conjecture draws the claim nudge instead (lib/conjecture.js); Cursor gives
 * a hook only the final text, so a mark earlier in the turn is not seen.
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

const MIN_GAP_ON_ERROR = 3; // nudge on error output, but not more often than this
const HOST = 'cursor';

const SHELL_TOOL_RE = /shell|terminal|bash|command|exec/i;
const { outputText, looksFailed } = require('../lib/fail.js');
const { cwdOf } = require('../lib/host.js');

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  if (!SHELL_TOOL_RE.test(String(data.tool_name || ''))) return;
  const cid = data.conversation_id || 'noconversation';

  // A failed call comes as postToolUseFailure, with error_message and no
  // tool_output (postToolUse fires only for a call that succeeded): the host's
  // word is the failure, whatever the message looks like. An interrupt is not one.
  const hostFailed = data.hook_event_name === 'postToolUseFailure' && !data.is_interrupt && (!data.failure_type || data.failure_type === 'error');
  const failed = hostFailed || looksFailed(outputText(data.tool_output).slice(0, 4000));
  let st;
  const fire = state.update(HOST, cid, (s) => {
    st = s;
    st.shell = (st.shell || 0) + 1;
    st.sinceNudge = (st.sinceNudge === undefined ? MIN_GAP_ON_ERROR : st.sinceNudge) + 1; // first error of a session fires
    if (st.carry) {
      st.carry = false;
      st.sinceNudge = 0;
      return 'claim';
    }
    const f = failed && st.sinceNudge >= MIN_GAP_ON_ERROR;
    if (f) st.sinceNudge = 0;
    return f ? 'failure' : null;
  });

  logEvent(cwdOf(data), { event: 'observe', host: 'cursor', conversation: cid, shell: st.shell, failed: failed, emitted: !!fire, kind: fire || null });
  if (fire) process.stdout.write(JSON.stringify({ additional_context: fire === 'claim' ? msg.CLAIM : msg.OBSERVE }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
