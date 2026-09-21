#!/usr/bin/env node
/*
 * Progress self-monitoring - Claude Code UserPromptSubmit hook (turn boundary).
 *
 * A user message is where a human re-enters the loop, so it is the turn
 * boundary: stamp the turn's start (the stop hook compares the ledger's mtime
 * against it), reset the edit counter, load the discipline once on the first
 * turn, and carry forward what the previous turn's close found - a turn that
 * edited files and left the ledger as it was - as a one-line retrospective.
 *
 * The sweep: what the agent wrote it would do later, two turns ago, handed
 * back as a question with the quote in it - once each. "Is there anything
 * you might be forgetting?" is only answerable with the inventory attached,
 * and this is the one inventory the agent cannot re-read.
 *
 * When the user's message says the work continues in a later session - the
 * one signal about residue that is decidable on arrival - it names the
 * ledger, so what this turn leaves open is written where that session will
 * find it.
 *
 * On the first turn it also says what SessionStart would have said, if
 * SessionStart did not run: some host modes fire one and not the other, and
 * a session that opens on an unread ledger is the failure this plugin is for.
 *
 * Output: stdout text is injected as context; empty output = nothing.
 * Fails silent: a hook error must never block a prompt.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const ledger = require('../lib/ledger.js');
const commitments = require('../lib/commitments.js');
const msg = require('../lib/messages.js');
const { cwdOf, context } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  const cwd = cwdOf(data);

  let turns = 0;
  let pending = null;
  let announced = null;
  let sweep = [];
  state.update(HOST, sid, (st) => {
    st.turns = (st.turns || 0) + 1;
    st.turn = signals.freshTurn();
    st.turnStart = Date.now();
    turns = st.turns;
    pending = st.pending || null;
    announced = st.announced === undefined ? null : st.announced;
    st.pending = null;
    // the sweep: commitments old enough to be handed back, once each
    const d = commitments.due(st.commitments, st.turns);
    sweep = d.ask;
    st.commitments = d.keep;
  });

  const out = [];
  let ins = null;
  if (turns === 1) {
    out.push(msg.LOAD);
    ins = ledger.inspect(cwd);
    if (ins.exists && ins.open > 0 && ins.fresh && announced !== ins.mtimeMs) {
      out.push(msg.status(ins));
      state.update(HOST, sid, (st) => { st.announced = ins.mtimeMs; });
    }
  }
  if (pending) out.push(msg.retrospective(pending));
  const spans = signals.spansSessions(data.prompt);
  if (spans) out.push(msg.spanning());
  if (sweep.length) out.push(msg.sweep(sweep, turns));

  logEvent(cwd, { event: 'prompt', session: sid, turn: turns, open: ins ? ins.open : undefined, retrospective: !!pending, spans, swept: sweep.length });
  if (out.length) process.stdout.write(context('UserPromptSubmit', out.join('\n')));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
