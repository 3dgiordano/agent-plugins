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
const { cwdOf } = require('../lib/host.js');

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
   * A pointer, not a paraphrase: "load ... if it is not already loaded" so the
   * every-Nth-turn cadence does not ask for the same load again and again.
   *
   * The marker is named and the four fields are not. Naming the marker is what
   * gets the block written at all - the observed failure across this set is an
   * agent doing the discipline and writing it in some other shape - while the
   * fields are static protocol and belong in the skill, which is also the only
   * place they can be kept in one piece.
   */
  process.stdout.write(
    '[executive self-monitoring] Checkpoint for long/iterative work: load the ' +
    'executive-self-monitoring skill if it is not already loaded, then re-open the ' +
    'artifact that defines this work and write its [PLAN CHECK] block. Not a ' +
    'blocker; skip if this turn is trivial.'
  );
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {}); // fail silent
