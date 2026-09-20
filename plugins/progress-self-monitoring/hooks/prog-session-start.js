#!/usr/bin/env node
/*
 * Progress self-monitoring - Claude Code SessionStart hook (session boundary).
 *
 * The one moment this plugin is for: a session opens - fresh, resumed,
 * cleared, or continuing after a compaction - and whatever the last one left
 * open is now only on disk. If the ledger exists, has open items and is not
 * older than MAX_AGE_DAYS, say so: the count, the age, the path. Nothing else
 * is injected, and the file's text never travels through this process.
 *
 * `compact` is included on purpose. The plugin's scope stops at the session
 * boundary, but a compaction drops the same thing a boundary does - the open
 * items the agent was holding in context - and the reminder is the same one
 * line, only when there is something to remind about.
 *
 * Silent when the ledger is absent, empty, or stale by age: a signal that
 * fires on every session is wallpaper.
 *
 * Output: stdout text is injected as context; empty output = nothing.
 * Fails silent: a hook error must never block a session start.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const ledger = require('../lib/ledger.js');
const msg = require('../lib/messages.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  const cwd = cwdOf(data);

  const ins = ledger.inspect(cwd);
  const speak = ins.exists && ins.open > 0 && ins.fresh;

  // Remember that this session was told, so the first prompt does not repeat
  // it: the prompt hook is the fallback for a host mode where SessionStart
  // did not run, not a second announcement.
  state.update(HOST, sid, (st) => { if (speak) st.announced = ins.mtimeMs; });

  logEvent(cwd, { event: 'session_start', session: sid, source: data.source || null, exists: ins.exists, open: ins.open, ageMs: ins.ageMs, emitted: speak });
  if (speak) process.stdout.write(msg.status(ins));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
