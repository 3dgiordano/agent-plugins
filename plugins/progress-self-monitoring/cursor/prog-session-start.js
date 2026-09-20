#!/usr/bin/env node
/*
 * Progress self-monitoring - Cursor sessionStart hook.
 *
 * Loads the discipline once per session via `additional_context`, and - the
 * moment this plugin is for - says what the ledger holds if it has open items
 * and is not stale by age: the count, the age, the path. Cursor's only
 * non-blocking injection point is this one, so the two travel together.
 *
 * Emits synchronously (no stdin wait) so it can never hang session start.
 * Plugin hooks run from the plugin directory, so the workspace root comes
 * from CURSOR_PROJECT_DIR (falling back to cwd for a hand-installed hook).
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const ledger = require('../lib/ledger.js');
const msg = require('../lib/messages.js');
const { cwdOf } = require('../lib/host.js');
const state = require('../lib/state.js');

const workspace = cwdOf({});

// Cursor has no session-end event, so residue is bounded by age here
// instead: drop any state file older than a week on the way past.
try { state.sweep(); } catch (_) {}

let ins = { exists: false, open: 0, ageMs: null, fresh: false };
try { ins = ledger.inspect(workspace); } catch (_) {}
const speak = ins.exists && ins.open > 0 && ins.fresh;

try { logEvent(workspace, { event: 'session_start', host: 'cursor', exists: ins.exists, open: ins.open, ageMs: ins.ageMs, emitted: speak }); } catch (_) {}
try {
  const text = speak ? msg.LOAD + '\n' + msg.status(ins) : msg.LOAD;
  process.stdout.write(JSON.stringify({ additional_context: text }));
} catch (_) {}
