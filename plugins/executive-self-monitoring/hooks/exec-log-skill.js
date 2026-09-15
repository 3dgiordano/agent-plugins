#!/usr/bin/env node
/*
 * Skill-invocation logger (PreToolUse, matcher "Skill"). DEBUG-ONLY.
 *
 * When enabled (env var EXECMON_LOG truthy) it appends one bounded JSONL line
 * per skill call to <cwd>/.claude/logs/executive-self-monitoring.jsonl, giving
 * durable evidence of WHEN skills (including executive-self-monitoring itself)
 * were invoked. OFF by default: with EXECMON_LOG unset this is a no-op and
 * tracks nothing. See lib/execlog.js for the gate + size-bounded rotation.
 *
 * Never blocks or alters the skill call: emits no stdout, exits 0.
 *
 * Input : PreToolUse JSON on stdin (session_id, cwd, tool_name, tool_input...).
 * Fails silent: a logging error must never block a tool call.
 */
'use strict';

const { logEvent, enabled } = require('../lib/execlog.js');

function main(raw) {
  if (!enabled()) return; // debug-only; skip parse work entirely when off
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) { return; }

  const ti = data.tool_input || {};
  const skill = (typeof ti.skill === 'string' && ti.skill) ? ti.skill : '(unknown)';

  logEvent(data.cwd, {
    event: 'skill',
    session: data.session_id || 'nosession',
    tool: data.tool_name || 'Skill',
    skill: skill,
    args: typeof ti.args === 'string' ? ti.args : undefined
  });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
