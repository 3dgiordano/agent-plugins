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
 * The protocol lives in the shared skill. A pointer alone was measured not to
 * load it (the skill opened 0 times in 28 Claude runs while the discipline
 * happened in prose). This message therefore names the block the scanner
 * reads, and asks for the skill only for the rules behind those fields.
 * It fires once per session, before the prompt is known, so a trivial turn
 * is told to skip it.
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
const { cwdOf } = require('../lib/host.js');

const MSG =
  '[executive self-monitoring] For long or iterative work, re-open the artifact that defines ' +
  'it and write the [PLAN CHECK] markdown list: Plan (the artifact, named), Gate (quoted from ' +
  'it), Drift (none, or what pulls away), Decision (continue | refocus | revise-plan). Load the ' +
  'executive-self-monitoring skill if it is not already loaded for the rules behind them. Skip ' +
  'this when the turn is trivial. Markers, field names and status words stay in English, whatever language you write in. Not a blocker - the plan defines the work.';

const workspace = cwdOf({});

try { logEvent(workspace, { event: 'session_start', host: 'cursor' }); } catch (_) {}
try { process.stdout.write(JSON.stringify({ additional_context: MSG })); } catch (_) {}
