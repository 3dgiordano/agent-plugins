#!/usr/bin/env node
/*
 * Aspiration self-monitoring - Cursor stop hook.
 *
 * Default: does nothing. The findings stay in the log. Cursor has no
 * non-blocking per-prompt injection point for the retrospective.
 *
 * Strict (ASPMON_STRICT): returns a followup_message once (loop_count === 0,
 * loop_limit 1), so the agent writes the block or stops claiming the result
 * is good enough. Fails silent.
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
