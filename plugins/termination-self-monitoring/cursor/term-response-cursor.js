#!/usr/bin/env node
/*
 * Termination self-monitoring - Cursor afterAgentResponse hook (observe-only).
 *
 * Cursor hands the agent's final text to this event but lets it change
 * nothing, so the stop scan is split in two: this script scans the text with
 * lib/lexicon.js, logs the result and parks any findings in session state;
 * the `stop` adapter (term-stop-cursor.js) then decides whether to act on
 * them.
 *
 * Fails silent; emits nothing.
 */
'use strict';

const { logEvent, strict } = require('../lib/log.js');
const state = require('../lib/state.js');
const { scan } = require('../lib/lexicon.js');
const { cwdOf } = require('../lib/host.js');

const HOST = 'cursor';

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  const cid = data.conversation_id || 'noconversation';

  const res = scan(data.text || '');
  logEvent(cwdOf(data), {
    event: 'stop', host: 'cursor', conversation: cid, hits: res.hits, apologies: res.apologies,
    blocks: res.blocks, violations: res.violations, strict: strict()
  });

  const st = state.load(HOST, cid);
  st.pending = res.violations; // replaced every response; consumed by the stop adapter
  state.save(HOST, cid, st);
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
