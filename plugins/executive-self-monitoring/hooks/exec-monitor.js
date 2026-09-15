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

const EVERY_N_TURNS = 5; // after the session-start fire, remind every N turns

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }

  let sid = 'nosession';
  if (typeof data.session_id === 'string' && data.session_id) sid = data.session_id;

  const safe = sid.replace(/[^0-9A-Za-z_-]/g, '_');
  const counterFile = path.join(os.tmpdir(), `claude_execmon_${safe}.txt`);

  let count = 0;
  try { count = parseInt(fs.readFileSync(counterFile, 'utf8'), 10) || 0; } catch (_) {}
  count += 1;
  try { fs.writeFileSync(counterFile, String(count)); } catch (_) {}

  const fire = count === 1 || count % EVERY_N_TURNS === 0;

  logEvent(data.cwd, { event: 'prompt', session: sid, count: count, emitted: fire });

  if (!fire) return;

  process.stdout.write(
    '[executive self-monitoring] Checkpoint for long/iterative work: invoke the ' +
    'executive-self-monitoring skill (the source of truth) before substantive steps ' +
    '- name the active plan/gate and confirm this step serves it. Not a blocker; ' +
    'skip if this turn is trivial.'
  );
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {}); // fail silent
