#!/usr/bin/env node
/*
 * Persistence self-monitoring - Cursor sessionStart hook.
 *
 * Loads the discipline once per session via `additional_context`. The shared
 * skill carries the protocol; the signals come from postToolUse.
 *
 * Emits synchronously (no stdin wait) so it can never hang session start.
 * Plugin hooks run from the plugin directory, so the workspace root comes from
 * CURSOR_PROJECT_DIR (falling back to cwd for a hand-installed project hook).
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const msg = require('../lib/messages.js');
const { cwdOf } = require('../lib/host.js');

const workspace = cwdOf({});

try { logEvent(workspace, { event: 'session_start', host: 'cursor' }); } catch (_) {}
try { process.stdout.write(JSON.stringify({ additional_context: msg.LOAD })); } catch (_) {}
