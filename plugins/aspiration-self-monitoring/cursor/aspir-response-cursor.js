#!/usr/bin/env node
/*
 * Aspiration self-monitoring - Cursor afterAgentResponse hook (observe-only).
 *
 * Scans the final text with the turn's edit and review counts, logs the result,
 * parks findings for the stop adapter, and starts the next turn's count.
 * Emits nothing. Fails silent.
 */
'use strict';

const { logEvent, strict } = require('../lib/log.js');
const state = require('../lib/state.js');
const { scan } = require('../lib/lexicon.js');
const { freshTurn, unreviewed, looked } = require('../lib/signals.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';

  let res = null;
  let counts = {};
  state.update(HOST, cid, (st) => {
    counts = { edits: st.edits || 0, unreviewed: unreviewed(st), looked: looked(st, cwdOf(data)) };
    res = scan(data.text || '', counts);
    st.pending = res.violations;
    freshTurn(st);
  });
  logEvent(cwdOf(data), {
    event: 'response', host: 'cursor', conversation: cid, claims: res.claims, blocks: res.blocks,
    remainder: res.remainder, edits: counts.edits, unreviewed: counts.unreviewed, violations: res.violations, strict: strict()
  });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
