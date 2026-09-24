#!/usr/bin/env node
/*
 * Progress self-monitoring - Claude Code Stop hook (close of the turn).
 *
 * Reads two things and compares them: the turn's counters (did it edit files,
 * did it write the ledger) and the ledger on disk (does it exist, how many
 * items are open, when was it last written). A turn that moved the work and
 * left a ledger with open items untouched is the finding. It is parked for
 * the next prompt, once per ledger version - see lib/signals.js - and shown
 * to the user now as a one-line notice.
 *
 * The final message is not scanned for "work was left open" - those phrases
 * belong to coverage, termination and handoff, which already read the close;
 * a fourth reader of the same sentence would fire four times on it. The
 * witness for the stale ledger is the file's mtime, which none of them has.
 * What IS read off the message is the one thing none of them collects: what
 * the agent said it would do later in this session (lib/commitments.js),
 * kept so the prompt hook can hand it back two turns on.
 *
 * Never blocks: there is no strict mode. The last turn of a session is
 * unreachable for a retrospective, and that is measured at SessionEnd rather
 * than gated - a gate is a decision to take with the numbers, not before.
 *
 * SubagentStop is measured only: a subagent has no next prompt to carry a
 * retrospective, and its edits are the parent's turn - so its close is logged
 * and nothing is parked. Same rule as the other four close hooks.
 */
'use strict';

const { logEvent, notices } = require('../lib/log.js');
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
  const subagent = data.hook_event_name === 'SubagentStop';

  const ins = ledger.inspect(cwd);
  let res = { stale: false, fire: false };
  let parked = null;
  let turn = null;
  let turns = 0;
  // What this message says the agent will do later: kept for the sweep, on
  // main turns only - a subagent's promise is not the parent's.
  const promised = subagent ? [] : commitments.scan(data.last_assistant_message || '');
  state.update(HOST, sid, (st) => {
    turn = st.turn || signals.freshTurn();
    turns = st.turns || 0;
    res = signals.stale(turn, ins, st.turnStart, st.flagged);
    if (subagent) return;
    // `flagged` holds the mtime of the ledger version already reported; a
    // rewrite changes the mtime and so re-arms the signal by itself.
    if (res.fire) {
      st.pending = parked = { open: ins.open, edits: turn.edits };
      st.flagged = ins.mtimeMs;
    }
    if (promised.length) st.commitments = commitments.remember(st.commitments, promised, turns);
  });

  logEvent(cwd, Object.assign({
    event: subagent ? 'subagent_stop' : 'stop', session: sid, agent: data.agent_type || null, turn: turns,
    exists: ins.exists, open: ins.open, ageMs: ins.ageMs, stale: res.stale, fired: !subagent && res.fire,
    commitments: promised.length
  }, signals.summary(turn)));

  // The finding reaches the user now, the model on the next prompt (lib/host.js).
  if (parked && notices()) process.stdout.write(context('Stop', '', msg.staleNotice(parked)));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
