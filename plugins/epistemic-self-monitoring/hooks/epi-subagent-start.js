#!/usr/bin/env node
/*
 * epistemic-self-monitoring - Claude Code (and Codex) SubagentStart hook.
 *
 * A subagent starts with an empty context and never gets a user prompt, so
 * the load the main agent gets on its prompts (hooks/epi-prompt.js) would never
 * reach it. This gives it the same words at its start. Its shell commands keep
 * their own cadence (hooks/epi-observe.js), and their reminders go to it.
 *
 * Emits the load or nothing, never blocks, fails silent.
 */
'use strict';

const msg = require('../lib/messages.js');
const { context } = require('../lib/host.js');

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }
  if (data.hook_event_name !== 'SubagentStart') return;
  process.stdout.write(context('SubagentStart', msg.LOAD));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
