#!/usr/bin/env node
/*
 * executive self-monitoring - Claude Code (and Codex) SessionStart / SubagentStart
 * hook: puts the executive-self-monitoring skill's text in context where a
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

const fs = require('fs');
const os = require('os');
const path = require('path');
const { context, skillText } = require('../lib/host.js');

const PLUGIN = 'executive';
const HOST = 'claude';

// Whether this session was given the text: a marker file beside the cadence
// counter (hooks/exec-session-start.js), with no state of its own.
function marker(sid) {
  const dir = path.join(os.tmpdir(), '3dgiordano-agent-plugins');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
  return path.join(dir, `execmon_${HOST}_${String(sid).replace(/[^0-9A-Za-z_-]/g, '_')}.injected`);
}

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const subagent = data.hook_event_name === 'SubagentStart';
  const sid = data.session_id || 'nosession';
  if (!subagent && data.source === 'resume' && fs.existsSync(marker(sid))) return;
  const text = skillText(path.join(__dirname, '..'), PLUGIN);
  if (!text) return;
  if (!subagent) { try { fs.writeFileSync(marker(sid), '1'); } catch (_) {} }
  process.stdout.write(context(subagent ? 'SubagentStart' : 'SessionStart', text));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
