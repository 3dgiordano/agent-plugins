#!/usr/bin/env node
/*
 * hygiene self-monitoring - Claude Code (and Codex) SessionStart / SubagentStart
 * hook: puts the hygiene-self-monitoring skill's text in context where a
 * conversation begins, and takes the session's baseline - the public surface
 * of the code files near the project root (lib/signals.js snapshot).
 *
 * SessionStart: a new session, a /clear, and after a compaction, which
 * summarised the text away. A resume brings the conversation back with the
 * text and the baseline already there, so it sends the text only to a session
 * that never had it. SubagentStart: every subagent, whose context starts
 * empty; its edits land in the parent's record.
 *
 * Emits the text or nothing, never blocks, fails silent.
 */
'use strict';

const path = require('path');
const state = require('../lib/state.js');
const { snapshot } = require('../lib/signals.js');
const { logEvent } = require('../lib/log.js');
const { context, skillText, cwdOf } = require('../lib/host.js');

const PLUGIN = 'hygiene';
const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const subagent = data.hook_event_name === 'SubagentStart';
  const sid = data.session_id || 'nosession';
  const cwd = cwdOf(data);
  if (!subagent && data.source === 'resume' && state.load(HOST, sid).injected) return;
  let files = 0;
  if (!subagent) {
    state.update(HOST, sid, (st) => {
      st.injected = true;
      if (!st.snapshotted || data.source === 'clear' || data.source === 'startup') {
        st.files = {};
        st.nudges = 0;
        st.nudgedAt = 0;
        files = snapshot(st, cwd);
        st.snapshotted = true;
      }
    });
    logEvent(cwd, { event: 'session_start', session: sid, source: data.source || null, files });
  }
  const text = skillText(path.join(__dirname, '..'), PLUGIN);
  if (text) process.stdout.write(context(subagent ? 'SubagentStart' : 'SessionStart', text));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
