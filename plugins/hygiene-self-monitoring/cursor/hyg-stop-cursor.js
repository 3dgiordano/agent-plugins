#!/usr/bin/env node
/*
 * Hygiene self-monitoring - Cursor stop hook.
 *
 * Default: does nothing. The findings stay in the log. Cursor has no
 * non-blocking per-prompt injection point for the retrospective.
 *
 * Strict (HYGMON_STRICT): returns a followup_message once (loop_count === 0,
 * loop_limit 1), so the agent accounts for what its edits reached. Fails
 * silent.
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

  let pending = [];
  state.update(HOST, cid, (st) => {
    pending = Array.isArray(st.pending) ? st.pending : [];
    st.pending = [];
  });

  const firstStop = !data.loop_count;
  const blocking = strict() && pending.length > 0 && firstStop && data.status !== 'aborted';
  logEvent(cwdOf(data), { event: 'stop', host: 'cursor', conversation: cid, status: data.status, violations: pending.length, blocked: blocking });
  if (blocking) process.stdout.write(JSON.stringify({ followup_message: msg.blockReason(pending) }));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
