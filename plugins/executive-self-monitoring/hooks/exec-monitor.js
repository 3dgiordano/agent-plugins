#!/usr/bin/env node
/*
 * Executive self-monitoring cadence hook (UserPromptSubmit).
 *
 * Cross-platform (Node, which ships with Claude Code). Its ONLY job is the
 * "when": fire on the first turn of a session, then every Nth turn, silent in
 * between, so the nudge stays a signal rather than wallpaper. It does not carry
 * the protocol -- the executive-self-monitoring SKILL is the single source of
 * truth for the "what". This hook just tells the agent it's time to invoke it.
 *
 * Optional DEBUG-ONLY audit: when the env var EXECMON_LOG is set, it appends one
 * bounded JSONL line per user prompt (see lib/execlog.js). Off by default -- the
 * reminder works without it and no session data is tracked unless you opt in.
 *
 * Input : UserPromptSubmit JSON on stdin (session_id, cwd, prompt, ...).
 * Output: stdout text is injected as context; empty output = no reminder.
 * Fails silent: a hook error must never block a prompt.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { logEvent } = require('../lib/execlog.js');
const { cwdOf, context } = require('../lib/host.js');

const EVERY_N_TURNS = 5; // after the session-start fire, remind every N turns

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }

  let sid = 'nosession';
  if (typeof data.session_id === 'string' && data.session_id) sid = data.session_id;

  const safe = sid.replace(/[^0-9A-Za-z_-]/g, '_');
  // <tmpdir>/3dgiordano-agent-plugins/execmon_<host>_<session>.txt, the same
  // directory and the same name shape as the other five plugins' state files.
  // The host goes in the middle, not in front: the counter is host-neutral and
  // this is the Claude adapter's copy of it.
  const dir = path.join(os.tmpdir(), '3dgiordano-agent-plugins');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
  const counterFile = path.join(dir, `execmon_claude_${safe}.txt`);

  let count = 0;
  try { count = parseInt(fs.readFileSync(counterFile, 'utf8'), 10) || 0; } catch (_) {}
  count += 1;
  try { fs.writeFileSync(counterFile, String(count)); } catch (_) {}

  const fire = count === 1 || count % EVERY_N_TURNS === 0;

  logEvent(cwdOf(data), { event: 'prompt', session: sid, count: count, emitted: fire });

  if (!fire) return;

  /*
   * The marker used to be named and the four fields were not, on the reasoning
   * that the fields are static protocol and belong in the skill. Measured, that
   * reasoning was wrong in a way worth recording: six runs of this plugin's
   * eval case, logged through the Skill PreToolUse hook, loaded the skill ZERO
   * times and wrote the block zero times - while doing the whole discipline in
   * prose, quoting the gate and naming every tangent.
   *
   * The agent did not need the skill to know what to do. It needed the block's
   * shape, and that was the one thing the message withheld. A pointer only
   * works when what it points at is what the reader lacks.
   *
   * So the fields are named here, which is the same rule that took handoff's
   * pre-close message from 0 of 3 to 3 of 3. The rules behind them stay in the
   * skill and are referenced.
   */
  process.stdout.write(context('UserPromptSubmit',
    '[executive self-monitoring] Checkpoint for long/iterative work: re-open the artifact that ' +
    'defines it and write the [PLAN CHECK] markdown list - Plan (the artifact, named), Gate (quoted ' +
    'from it), Drift (none, or what pulls away), Decision (continue | refocus | revise-plan). Load ' +
    'the executive-self-monitoring skill if it is not already loaded for the rules behind them. ' +
    'Markers, field names and status words stay in English, whatever language you write in. Not a blocker; skip if this turn is trivial.'
  ));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {}); // fail silent
