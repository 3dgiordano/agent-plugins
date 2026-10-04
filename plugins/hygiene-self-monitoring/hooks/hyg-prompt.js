#!/usr/bin/env node
/*
 * Hygiene self-monitoring - Claude Code UserPromptSubmit hook.
 *
 * If the previous turn's stop scan left findings, carries them forward as a
 * one-line retrospective. The edit record is the session's, not the turn's:
 * a change made two prompts ago still reaches what it reached.
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
const { cwdOf, context, notification } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  if (notification(data.prompt)) return;

  let pending = [];
  let turn = 0;
  state.update(HOST, sid, (st) => {
    st.turns = (st.turns || 0) + 1;
    turn = st.turns;
    pending = Array.isArray(st.pending) ? st.pending : [];
    st.pending = [];
  });

  logEvent(cwdOf(data), { event: 'prompt', session: sid, turn, retrospective: pending.length });
  if (pending.length) process.stdout.write(context('UserPromptSubmit', msg.retrospective(pending)));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
