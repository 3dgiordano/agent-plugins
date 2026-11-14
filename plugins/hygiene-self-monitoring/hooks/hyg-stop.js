#!/usr/bin/env node
/*
 * Hygiene self-monitoring - Claude Code (and Codex) Stop hook.
 *
 * Reads the final message's [HYGIENE CHECK] against the session's edit record
 * (lib/block.js): a close with no block after the edits reached two or more
 * public functions; Outside named and kept; Outside none while a public
 * function the edits reached is not in Request names; Outside put back or
 * offered while such a function is still changed. The hook never decides
 * whether a change was right - only whether the block accounts for what the
 * edits reached.
 *
 * Default: park the finding for the next prompt, and show the user one line -
 * except an Outside named and kept while the record shows a public function
 * changed that Request names does not name, which holds the stop once. Strict (HYGMON_STRICT): block the stop once on any finding. A subagent close is measured
 * only - never blocks, never parks.
 *
 * Fails silent: any error lets the stop proceed.
 */
'use strict';

const { logEvent, strict, notices } = require('../lib/log.js');
const state = require('../lib/state.js');
const { scan, parse, named } = require('../lib/block.js');
const { reachedAll, reachedWith } = require('../lib/signals.js');
const msg = require('../lib/messages.js');
const { cwdOf, context, actorOf } = require('../lib/host.js');

const HOST = 'claude';
const MAX_SETTLED = 400;

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const sid = data.session_id || 'nosession';
  const subagent = data.hook_event_name === 'SubagentStop';
  const actor = actorOf(data);

  // A subagent's close is weighed on its own reach (measured only). The main
  // agent's close on its own reach and every subagent's: it ships them all.
  const main = state.load(HOST, sid);
  const subs = subagent ? [] : state.actors(HOST, sid).map((a) => state.load(HOST, sid, a));
  // A turn that edited no code is not judged on what earlier turns changed:
  // the record is the session's, the close answers this turn's request.
  const turn = main.turns || 0;
  if (!subagent && ![main].concat(subs).some((r) => r && r.lastEditTurn === turn)) {
    logEvent(cwdOf(data), { event: 'stop', session: sid, actor, skipped: 'no edit this turn' });
    return;
  }
  // A function an earlier close named in Request names is settled, until its
  // file is edited again.
  const settled = (main.settled && typeof main.settled === 'object') ? main.settled : {};
  const keyOf = (g) => `${g.file}|${(g.names || []).join(',')}`;
  const groups = (subagent ? reachedAll(state.load(HOST, sid, actor)) : reachedWith(main, subs))
    .filter((g) => !(settled[keyOf(g)] >= (g.at || 0)));
  const res = scan(data.last_assistant_message || '', groups);
  // A block that keeps what its own Outside names, while the record shows a
  // public function changed that Request names does not name, holds the close
  // once in either mode: parked for the next prompt, it never reached a
  // one-turn task (lib/block.js `contradicts`).
  const blocking = Boolean(strict() ? res.violations.length > 0 : res.contradicts) && !data.stop_hook_active && !subagent;

  logEvent(cwdOf(data), {
    event: subagent ? 'subagent_stop' : 'stop', session: sid, actor, block: res.block, decision: res.decision || null,
    reached: groups.length, bySubagents: groups.filter((g) => g.by === 'subagent').length,
    violations: res.violations.length, strict: strict(), blocked: blocking
  });

  // What this close named in Request names is settled - not what it names
  // in Outside, whose decision may still ask for a change, nor a held close.
  const b = !subagent && !blocking && res.block ? parse(data.last_assistant_message || '') : null;
  const settle = b ? groups.filter((g) => g.how !== 'added' && named(g, b.request)) : [];
  if (!subagent && !blocking && (res.violations.length || settle.length)) {
    state.update(HOST, sid, (s) => {
      if (res.violations.length) s.pending = res.violations;
      if (settle.length) {
        if (!s.settled || typeof s.settled !== 'object') s.settled = {};
        const now = Date.now();
        for (const g of settle) s.settled[keyOf(g)] = now;
        const keys = Object.keys(s.settled);
        if (keys.length > MAX_SETTLED) for (const k of keys.slice(0, keys.length - MAX_SETTLED)) delete s.settled[k];
      }
    });
  }
  if (!subagent && !blocking && res.violations.length && notices()) process.stdout.write(context('Stop', '', msg.notice(res.violations)));
  if (blocking) {
    process.stderr.write(msg.blockReason(res.violations));
    process.exitCode = 2;
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
