#!/usr/bin/env node
/*
 * handoff self-monitoring - Claude Code (and Codex) SessionStart / SubagentStart
 * hook: puts the handoff-self-monitoring skill's text in context where a
 * conversation begins, so the agent has the rules without having to load them.
 *
 * SessionStart: a new session, a /clear, and after a compaction, which
 * summarised the text away. A resume brings the conversation back with the
 * text already in it, so it sends the text only to a session that never had
 * it. SubagentStart: every subagent, whose context starts empty.
 *
 * Emits the text or nothing, never blocks, fails silent.
 */
'use strict';

const path = require('path');
const state = require('../lib/state.js');
const { context, skillText } = require('../lib/host.js');

const PLUGIN = 'handoff';
const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const subagent = data.hook_event_name === 'SubagentStart';
  const sid = data.session_id || 'nosession';
  if (!subagent && data.source === 'resume' && state.load(HOST, sid).injected) return;
  const text = skillText(path.join(__dirname, '..'), PLUGIN);
  if (!text) return;
  if (!subagent) state.update(HOST, sid, (st) => { st.injected = true; });
  process.stdout.write(context(subagent ? 'SubagentStart' : 'SessionStart', text));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
