#!/usr/bin/env node
/*
 * Integrity self-monitoring - Cursor afterAgentResponse hook (log only).
 *
 * Reads the response for the [INTEGRITY CHECK] block and for a dispute of a
 * finding raised this conversation, and logs both. Cursor has no point after
 * this where a line reaches the person or the agent, so a dispute is taken
 * (the finding is not raised again) and logged, not shown. A headless run
 * does not fire this event at all.
 *
 * Observe-only; emits nothing. Fails silent.
 */
'use strict';

const { logEvent } = require('../lib/log.js');
const state = require('../lib/state.js');
const signals = require('../lib/signals.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';
  const text = data.text || '';

  let taken = [];
  let raisedCount = 0;
  state.update(HOST, cid, (st) => {
    const raised = Array.isArray(st.raised) ? st.raised : [];
    raisedCount = raised.length;
    taken = signals.disputes(text, raised);
    if (taken.length) {
      st.disputed = [...new Set((st.disputed || []).concat(taken.map((d) => d.key)))].slice(-signals.MAX_RAISED);
      st.raised = raised.filter((x) => !taken.some((d) => d.key === x.key));
    }
  });
  logEvent(cwdOf(data), { event: 'stop', host: 'cursor', conversation: cid, raised: raisedCount, block: signals.block(text), disputes: taken });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
