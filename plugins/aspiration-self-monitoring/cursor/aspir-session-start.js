#!/usr/bin/env node
/*
 * Aspiration self-monitoring - Cursor sessionStart hook.
 *
 * Injects the discipline once per session via additional_context: the load
 * message and the skill's text, so the agent has the protocol without loading
 * it.
 *
 * Emits synchronously (no stdin wait) so it can never hang session start.
 */
'use strict';

const path = require('path');
const { logEvent } = require('../lib/log.js');
const msg = require('../lib/messages.js');
const { cwdOf, skillText } = require('../lib/host.js');
const state = require('../lib/state.js');

const workspace = cwdOf({});

try { state.sweep(); } catch (_) {}
try { logEvent(workspace, { event: 'session_start', host: 'cursor' }); } catch (_) {}
// The skill's text rides with it (lib/host.js skillText): Cursor's subagentStart
// takes no context, so this is where it reaches the agent.
try { process.stdout.write(JSON.stringify({ additional_context: [msg.LOAD, skillText(path.join(__dirname, '..'), 'aspiration')].filter(Boolean).join('\n\n') })); } catch (_) {}
