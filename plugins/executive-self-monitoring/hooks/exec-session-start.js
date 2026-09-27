#!/usr/bin/env node
/*
 * executive-self-monitoring - Claude Code SessionStart hook (matcher: resume|compact).
 *
 * The cadence fires on a session's first prompt. A resumed session, or one
 * that continues after a compaction, starts the count again, so its next
 * prompt carries the checkpoint - what Cursor does on every sessionStart. The
 * counter is kept across the resume otherwise (exec-session-end.js).
 *
 * Emits nothing, never blocks, fails silent.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  if (data.source !== 'resume' && data.source !== 'compact') return;
  const sid = typeof data.session_id === 'string' && data.session_id ? data.session_id : 'nosession';
  const dir = path.join(os.tmpdir(), '3dgiordano-agent-plugins');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
  try { fs.writeFileSync(path.join(dir, `execmon_claude_${sid.replace(/[^0-9A-Za-z_-]/g, '_')}.txt`), '0'); } catch (_) {}
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
