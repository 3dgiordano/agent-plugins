#!/usr/bin/env node
/*
 * Aspiration self-monitoring - Claude Code UserPromptSubmit hook.
 *
 * Starts the turn's edit and review record, loads the discipline on the first turn
 * of a session and re-states it every Nth turn. If the previous turn's stop
 * scan left findings, carries them forward as a one-line retrospective.
 *
 * The prompt's text is never read into a message.
 *
 * Output: the envelope with additionalContext, or nothing.
 * Fails silent: a hook error must never block a prompt.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const msg = require('../lib/messages.js');
const { freshTurn } = require('../lib/signals.js');
const { cwdOf, context, notification } = require('../lib/host.js');

const EVERY_N_TURNS = 10;
const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  if (notification(data.prompt)) return;

  let turn = 0;
  let reload = false;
  let pending = [];
  state.update(HOST, sid, (st) => {
    st.turns = (st.turns || 0) + 1;
    turn = st.turns;
    reload = !!st.reload;
    st.reload = false;
    pending = Array.isArray(st.pending) ? st.pending : [];
    st.pending = [];
    freshTurn(st);
  });

  const load = turn === 1 || reload || turn % EVERY_N_TURNS === 0;
  const parts = [];
  if (load) parts.push(msg.LOAD);
  if (pending.length) parts.push(msg.retrospective(pending));

  logEvent(cwdOf(data), { event: 'prompt', session: sid, turn, load, retrospective: pending.length });
  if (parts.length) process.stdout.write(context('UserPromptSubmit', parts.join('\n')));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
