#!/usr/bin/env node
/*
 * Executive self-monitoring - Claude Code PostToolUse hook
 * (matcher: Read|Write|Edit|MultiEdit|NotebookEdit).
 *
 * Records which documents the agent read, and their mtime, so the next
 * prompt can say that one changed on disk since the agent's last Read, Write
 * or Edit of it (lib/reads.js). Emits nothing; the prompt hook speaks.
 *
 * Each actor keeps its own reads: a subagent's read of the plan is not the
 * main agent's, and its edit of a document the main agent read is a change
 * the main agent is told about at its next prompt.
 *
 * Fails silent: never blocks or alters the tool result.
 */
'use strict';

const reads = require('../lib/reads.js');
const { cwdOf, actorOf } = require('../lib/host.js');

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  reads.observe('claude', data.session_id || 'nosession', data.tool_name, data.tool_input, cwdOf(data), actorOf(data));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
