#!/usr/bin/env node
/*
 * Executive self-monitoring - Claude Code PostToolUse hook
 * (matcher: Read|Write|Edit|MultiEdit|NotebookEdit).
 *
 * Records which documents the agent read, and their mtime, so the next
 * prompt can say that one changed on disk since the agent's last Read, Write
 * or Edit of it (lib/reads.js). Emits nothing; the prompt hook speaks.
 *
 * Fails silent: never blocks or alters the tool result.
 */
'use strict';

const reads = require('../lib/reads.js');
const { cwdOf } = require('../lib/host.js');

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  reads.observe('claude', data.session_id || 'nosession', data.tool_name, data.tool_input, cwdOf(data));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
