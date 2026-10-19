#!/usr/bin/env node
/*
 * executive self-monitoring - Claude Code (and Codex) Stop hook.
 *
 * At the close of the main agent's turn, the turn's [PLAN CHECK] blocks
 * (lib/plan.js) say two things the plan write-back needs (lib/writeback.js):
 * which file the agent works from - the path its latest block names in
 * `Plan` - and whether a block decided `revise-plan`. The blocks are read
 * from the turn's part of the session transcript, since a block written at
 * the start of a turn is not in its final message; the final message is the
 * fallback when the transcript cannot be read. Only the named paths and the
 * revise-plan flag are kept.
 *
 * Emits nothing, never blocks, fails silent. A subagent's close is
 * exec-subagent-stop.js's.
 */
'use strict';

const reads = require('../lib/reads.js');
const writeback = require('../lib/writeback.js');
const { scan } = require('../lib/plan.js');
const { cwdOf, actorOf, MAIN_ACTOR } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  if (actorOf(data) !== MAIN_ACTOR) return;
  let res = scan(writeback.turnText(data.transcript_path));
  if (!res.blocks) res = scan(data.last_assistant_message || '');
  if (!res.blocks) return;
  const cwd = cwdOf(data);
  reads.update(HOST, data.session_id || 'nosession', (st) => writeback.onClose(st, res, cwd));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
