#!/usr/bin/env node
/*
 * Progress self-monitoring - Claude Code SessionStart hook (session boundary).
 *
 * The one moment this plugin is for: a session opens - fresh, resumed,
 * cleared, or continuing after a compaction - and whatever the last one left
 * open is now only on disk. If the ledger exists, say what is in it: the
 * open items by kind, whether it has a Next line, how many lines are not its
 * format, the age, the path. Nothing else is injected, and the file's text
 * never travels through this process.
 *
 * `compact` is included on purpose. The plugin's scope stops at the session
 * boundary, but a compaction drops the same thing a boundary does - the open
 * items the agent was holding in context - and the reminder is the same one
 * line.
 *
 * Silent when the ledger is absent: a project that keeps none pays nothing.
 * The user sees a line only when there is something to report.
 *
 * Output: stdout text is injected as context; empty output = nothing.
 * Fails silent: a hook error must never block a session start.
 */
'use strict';

const { logEvent, notices } = require('../lib/log.js');
const state = require('../lib/state.js');
const ledger = require('../lib/ledger.js');
const msg = require('../lib/messages.js');
const { cwdOf, context } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  const cwd = cwdOf(data);

  const ins = ledger.inspect(cwd);
  const speak = ins.exists; // any age, any content: the message says which

  // Remember that this session was told, so the first prompt does not repeat
  // it: the prompt hook is the fallback for a host mode where SessionStart
  // did not run, not a second announcement.
  //
  // The user's line waits for the next prompt. Claude Code records a
  // SessionStart systemMessage and the desktop app does not show it
  // (2026-09-25: two sessions opened on a ledger with open items, the notice
  // in the transcript as hook_system_message, only the Stop notices on
  // screen). The prompt hook delivers it once, on whatever turn comes next -
  // after a compaction that is not turn 1.
  const note = speak && notices() ? msg.statusNotice(ins) : '';
  state.update(HOST, sid, (st) => {
    if (speak) st.announced = ins.mtimeMs;
    st.notice = note || null;
  });

  logEvent(cwd, { event: 'session_start', session: sid, source: data.source || null, exists: ins.exists, open: ins.open, lines: ins.lines, bytes: ins.bytes, bloated: ins.bloated, ageMs: ins.ageMs, emitted: speak });
  if (speak) process.stdout.write(context('SessionStart', msg.status(ins), ''));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
