#!/usr/bin/env node
/*
 * Hygiene self-monitoring - Cursor sessionStart hook.
 *
 * Loads the discipline via `additional_context`, with the skill's text
 * (Cursor's subagentStart cannot add context, so the session start is the one
 * place it can go), and takes the baseline: the public surface of the code
 * files near the workspace root. The payload is not read - emitting at once
 * keeps the hook from ever holding up a session start - so the baseline is
 * kept under the workspace, and the first postToolUse of a conversation
 * copies it to that conversation.
 *
 * Fails silent.
 */
'use strict';

const path = require('path');
const { logEvent } = require('../lib/log.js');
const msg = require('../lib/messages.js');
const state = require('../lib/state.js');
const { snapshot } = require('../lib/signals.js');
const { cwdOf, skillText } = require('../lib/host.js');
const { workspaceId } = require('../lib/workspace.js');

const workspace = cwdOf({});

// Cursor has no session-end event: residue is bounded by age here instead.
try { state.sweep(); } catch (_) {}

let files = 0;
try {
  if (workspace) {
    const st = {};
    files = snapshot(st, workspace);
    st.taken = Date.now();
    state.save('cursor', workspaceId(workspace), st);
  }
} catch (_) {}
try { logEvent(workspace, { event: 'session_start', host: 'cursor', files }); } catch (_) {}
try { process.stdout.write(JSON.stringify({ additional_context: [msg.LOAD, skillText(path.join(__dirname, '..'), 'hygiene')].filter(Boolean).join('\n\n') })); } catch (_) {}
