#!/usr/bin/env node
/*
 * aspiration-self-monitoring - Claude Code SessionStart hook (matcher: resume|compact).
 *
 * A session that is resumed, or that continues after a compaction, gets the
 * discipline loaded again on its next prompt. The state itself survives, so
 * a retrospective the last Stop parked still reaches that prompt. Only a flag
 * is set here; the prompt hook says the words.
 *
 * Emits nothing, never blocks, fails silent.
 */
'use strict';

const state = require('../lib/state.js');

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  if (data.source !== 'resume' && data.source !== 'compact') return;
  state.update('claude', data.session_id || 'nosession', (st) => { st.reload = true; });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
