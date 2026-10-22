#!/usr/bin/env node
/*
 * handoff-self-monitoring - Claude Code SessionStart hook (matcher: resume|compact).
 *
 * A session that continues after a compaction gets the discipline loaded
 * again on its next prompt: what the compaction may have summarised away. A
 * resumed session does not: its transcript comes back whole, the earlier load
 * in it, as the skill injection already assumes. The state survives a resume
 * (the SessionEnd hook keeps it), so a retrospective the last Stop parked
 * still reaches the next prompt. Only a flag
 * is set here; the prompt hook says the words.
 *
 * Emits nothing, never blocks, fails silent.
 */
'use strict';

const state = require('../lib/state.js');

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  // A resume brings the transcript back whole, the earlier load in it: only a compaction loses it.
  if (data.source !== 'compact') return;
  state.update('claude', data.session_id || 'nosession', (st) => { st.reload = true; });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
