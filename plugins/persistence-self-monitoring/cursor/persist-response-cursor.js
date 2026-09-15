#!/usr/bin/env node
/*
 * Persistence self-monitoring - Cursor afterAgentResponse hook (turn boundary).
 *
 * Cursor has no non-blocking per-prompt event (beforeSubmitPrompt can block),
 * so the turn boundary is the end of the agent's response instead: log the
 * turn summary and reset the per-turn counters for the next user message.
 * Observe-only; emits nothing. Fails silent.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');

const HOST = 'cursor';

function workspaceOf(data) {
  if (Array.isArray(data.workspace_roots) && data.workspace_roots[0]) return data.workspace_roots[0];
  return process.env.CURSOR_PROJECT_DIR || process.cwd();
}

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';

  const st = state.load(HOST, cid);
  st.turns = (st.turns || 0) + 1;
  logEvent(workspaceOf(data), Object.assign({ event: 'turn', host: 'cursor', conversation: cid, turn: st.turns }, signals.summary(st.turn || signals.freshTurn())));
  st.turn = signals.freshTurn();
  state.save(HOST, cid, st);
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
