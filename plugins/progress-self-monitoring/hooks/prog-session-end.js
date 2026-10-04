#!/usr/bin/env node
/*
 * Progress self-monitoring - Claude Code SessionEnd hook (measure, then clean).
 *
 * The last turn of a session is the one turn no retrospective can reach: the
 * stop hook parks its finding for a next prompt that never comes. Whether
 * that matters is a number, not an argument - so before dropping the
 * session's state this hook logs how the session ended: does the ledger
 * exist, how many items are open, and did the session's last turn leave it
 * stale. That log stream is what a future opt-in strict gate would be
 * justified by, or not.
 *
 * Then the cleanup every plugin does: sweep aged residue. The session's own
 * state is kept for a resume. Emits nothing, never blocks, fails silent.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const ledger = require('../lib/ledger.js');
const claims = require('../lib/claims.js');
const { cwdOf } = require('../lib/host.js');

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) {}
  const sid = data.session_id || 'nosession';
  const cwd = cwdOf(data);

  try {
    const st = state.load('claude', sid);
    const ins = ledger.inspect(cwd);
    const res = signals.stale(st.turn, ins, st.turnStart, null);
    // A claim still in the file when the session ends is one only its
    // `until` releases: how often that happens is what the grace is argued from.
    const held = claims.tally(ins.claims, Date.now(), claims.token(sid)).mine.length;
    logEvent(cwd, Object.assign({
      event: 'session_end', session: sid, reason: data.reason || null, turns: st.turns || 0,
      exists: ins.exists, open: ins.open, ageMs: ins.ageMs, stale: res.stale, claimsHeld: held
    }, signals.summary(st.turn)));
  } catch (_) {}

  /*
   * The session's state is kept: a Claude Code session is resumed (claude -c,
   * --resume, the desktop and web apps after the process was recycled) and
   * SessionEnd fires every time its process exits. Dropping the state here
   * lost the retrospective the last Stop parked for the next prompt - the
   * Stop notice tells the user "the agent is reminded on your next message"
   * - and a desktop or cloud session's process can be recycled between two
   * of the user's messages. The age sweep bounds it.
   */
  state.sweep();
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
