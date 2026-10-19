#!/usr/bin/env node
/*
 * Progress self-monitoring - Claude Code PostToolUse hook (all tools).
 *
 * Counts the turn's file edits, and notes whether one of them wrote the
 * ledger. The counts are what let the close of the turn tell "the work moved
 * and the record did not" apart from "nothing moved" - without them the
 * stale signal would fire on every turn spent next to an old ledger, which is
 * the wallpaper this collection avoids.
 *
 * And it watches this session's claim (lib/claims.js): while the session
 * holds one, or when this call wrote the ledger, it reads the file and says -
 * once each - that the claim runs out soon, ran out, is gone, or shares its
 * item with another live claim. That is the one thing it ever says: the
 * clock and the other sessions' edits are what the agent cannot see from
 * inside the turn. A session with no claim costs one state update, as before.
 *
 * Fails silent: never blocks or alters the tool result.
 */
'use strict';

const { logEvent, notices } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const ledger = require('../lib/ledger.js');
const claims = require('../lib/claims.js');
const msg = require('../lib/messages.js');
const { cwdOf, context, actorOf, MAIN_ACTOR } = require('../lib/host.js');

const HOST = 'claude';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  const mine = claims.token(sid);
  const selfEdit = signals.editsLedger(data.tool_name, data.tool_input);
  // A subagent's tool call goes to its own turn; the claim is the session's,
  // so it is watched on the main agent's record whoever wrote the ledger.
  const actor = actorOf(data);
  let watch = false;
  state.update(HOST, sid, (st) => {
    if (!st.turn) st.turn = signals.freshTurn();
    signals.observe(st.turn, data.tool_name, data.tool_input);
    if (actor === MAIN_ACTOR) watch = !!mine && (selfEdit || !!(st.claim && st.claim.held));
  }, actor);

  // A subagent handed back: its edits join the main agent's turn.
  if (actor === MAIN_ACTOR && signals.SUBAGENT_TOOL_RE.test(String(data.tool_name || ''))) {
    const subs = state.actors(HOST, sid).map((a) => [a, state.load(HOST, sid, a)]);
    if (subs.length) {
      state.update(HOST, sid, (st) => {
        if (!st.turn) st.turn = signals.freshTurn();
        if (!st.relayed || typeof st.relayed !== 'object') st.relayed = {};
        for (const [a, sub] of subs) {
          if (!sub.turn) continue;
          if (!st.relayed[a]) st.relayed[a] = {};
          signals.relay(st.turn, sub.turn, st.relayed[a]);
        }
      });
    }
  }
  // A subagent's write to the ledger is the session's write: the claim watch reads it.
  if (actor !== MAIN_ACTOR) watch = !!mine && selfEdit;
  if (!watch) return;

  const cwd = cwdOf(data);
  const ins = ledger.inspect(cwd);
  const f = state.update(HOST, sid, (st) => claims.watch(st, ins, Date.now(), mine, selfEdit));
  if (!f) return;
  logEvent(cwd, { event: 'claim', session: sid, kind: f.kind });
  process.stdout.write(context('PostToolUse', msg.claimWarning(f, ins, mine), notices() ? msg.claimNotice(f, ins) : ''));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
