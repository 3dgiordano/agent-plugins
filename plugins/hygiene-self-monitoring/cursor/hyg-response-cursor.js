#!/usr/bin/env node
/*
 * Hygiene self-monitoring - Cursor afterAgentResponse hook (observe-only).
 *
 * Reads the final text's [HYGIENE CHECK] against the conversation's edit
 * record (lib/block.js), logs the result and parks findings for the stop
 * adapter. Emits nothing. Fails silent.
 */
'use strict';

const { logEvent, strict } = require('../lib/log.js');
const state = require('../lib/state.js');
const { scan } = require('../lib/block.js');
const { reachedAll } = require('../lib/signals.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';
  let res = { block: false, violations: [] };
  let reached = 0;
  state.update(HOST, cid, (st) => {
    const groups = reachedAll(st);
    reached = groups.length;
    res = scan(data.text || '', groups);
    st.pending = res.violations;
  });
  logEvent(cwdOf(data), { event: 'response', host: 'cursor', conversation: cid, block: res.block, decision: res.decision || null, reached, violations: res.violations.length, strict: strict() });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
