#!/usr/bin/env node
/*
 * Epistemic self-monitoring - Cursor stop hook (the closure gate).
 *
 * Reads the findings parked by epi-response-cursor.js for this conversation.
 *
 * Default (non-strict): does nothing -- the findings stay in the log and the
 * next sessionStart/turn carries no retrospective (Cursor has no non-blocking
 * per-prompt injection point).
 *
 * Strict (env EPIMON_STRICT truthy): returns a `followup_message`, which Cursor
 * submits as the next user turn, so the agent fixes the [EPISTEMIC CLOSE]
 * block before the conversation ends. Only on loop_count === 0 (and the
 * hooks.json `loop_limit` is 1), so the gate fires once, never in a loop.
 *
 * Fails silent: any error lets the stop proceed.
 */
'use strict';

const { logEvent, strict } = require('../lib/log.js');
const state = require('../lib/state.js');
const msg = require('../lib/messages.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';

  const st = state.load(HOST, cid);
  const pending = Array.isArray(st.pending) ? st.pending : [];
  st.pending = [];
  state.save(HOST, cid, st);

  const firstStop = !data.loop_count;
  const blocking = strict() && pending.length > 0 && firstStop && data.status !== 'aborted';

  logEvent(cwdOf(data), { event: 'stop', host: 'cursor', conversation: cid, status: data.status, violations: pending, blocked: blocking });

  if (blocking) process.stdout.write(JSON.stringify({ followup_message: msg.blockReason(pending) }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
