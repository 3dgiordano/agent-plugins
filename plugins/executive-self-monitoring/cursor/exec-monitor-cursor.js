#!/usr/bin/env node
/*
 * Executive self-monitoring - Cursor sessionStart hook.
 *
 * Cursor's hook model differs from Claude Code's: only `sessionStart` can inject
 * context non-blockingly (via `additional_context`). `beforeSubmitPrompt` can
 * only BLOCK a prompt, which would violate the "self-check, not a blocker"
 * principle. So the Cursor adapter injects the checkpoint ONCE per session at
 * start -- the equivalent of the Claude Code hook's "fire on turn 1". The
 * every-Nth-turn cadence is intentionally not reproduced (it can't be done
 * without blocking).
 *
 * The protocol itself lives in the shared skill (skills/executive-self-monitoring),
 * which Cursor loads directly from the plugin -- this hook only points at it.
 *
 * Output: JSON on stdout with `additional_context` added to the session context.
 * Optional DEBUG-ONLY audit (env EXECMON_LOG): logs a session_start event via the
 * shared logger under <workspace>/.cursor/logs. Off by default.
 *
 * Emits synchronously (no stdin wait) so it can never hang session start. Plugin
 * hooks run from the plugin directory, so the workspace root is taken from
 * CURSOR_PROJECT_DIR (falling back to cwd for a hand-installed project hook).
 */
'use strict';

const { logEvent } = require('../lib/execlog.js');

const MSG =
  '[executive self-monitoring] For long or iterative work, periodically re-ground: ' +
  'name the active plan/gate and confirm your current step serves it. If you cannot ' +
  'name it, or you are chasing a number/optimization the plan did not ask for, ' +
  're-read the plan before continuing. Use the executive-self-monitoring skill for ' +
  'the full protocol. This is a self-check, not a blocker - the plan defines the work.';

const workspace = process.env.CURSOR_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd();

try { logEvent(workspace, { event: 'session_start', host: 'cursor' }); } catch (_) {}
try { process.stdout.write(JSON.stringify({ additional_context: MSG })); } catch (_) {}
