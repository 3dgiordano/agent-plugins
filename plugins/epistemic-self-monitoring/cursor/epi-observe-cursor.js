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
const { outputText, looksFailed } = require('../lib/fail.js');
const { cwdOf } = require('../lib/host.js');

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  if (!SHELL_TOOL_RE.test(String(data.tool_name || ''))) return;
  const cid = data.conversation_id || 'noconversation';

  const failed = looksFailed(outputText(data.tool_output).slice(0, 4000));
  let st;
  const fire = state.update(HOST, cid, (s) => {
    st = s;
    st.shell = (st.shell || 0) + 1;
    st.sinceNudge = (st.sinceNudge === undefined ? MIN_GAP_ON_ERROR : st.sinceNudge) + 1; // first error of a session fires
    const f = st.shell % EVERY_N_COMMANDS === 0 || (failed && st.sinceNudge >= MIN_GAP_ON_ERROR);
    if (f) st.sinceNudge = 0;
    return f;
  });

  logEvent(cwdOf(data), { event: 'observe', host: 'cursor', conversation: cid, shell: st.shell, failed: failed, emitted: fire });
  if (fire) process.stdout.write(JSON.stringify({ additional_context: msg.OBSERVE }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
