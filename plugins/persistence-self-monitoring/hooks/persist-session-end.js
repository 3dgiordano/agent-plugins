#!/usr/bin/env node
/*
 * persistence-self-monitoring - Claude Code SessionEnd hook (cleanup only).
 *
 * The per-turn counters live in one small JSON file per session in the OS temp
 * dir. They are kept for a resume (see below); this sweeps any residue older
 * than a week on the way past (SessionEnd does not fire when the
 * host is killed, and Cursor has no equivalent event).
 *
 * Emits nothing, never blocks, fails silent.
 */
'use strict';

const state = require('../lib/state.js');

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) {}
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
