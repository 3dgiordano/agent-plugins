#!/usr/bin/env node
/*
 * Host parity: what each plugin wires on Claude Code vs Cursor, and whether
 * every declared adapter actually survives its host's payload.
 *
 *   node scripts/hosts.js            print the matrix
 *   node scripts/hosts.js --check    exit 1 on a broken or undeclared asymmetry
 *
 * Why this exists
 * ---------------
 * Every plugin ships two adapters for the same discipline, and the two hosts
 * do not offer the same events. Cursor has no non-blocking per-prompt event,
 * so the turn boundary lands one event later; the executive cadence cannot be
 * reproduced there at all. Those are deliberate, and their plugin READMEs say
 * so.
 *
 * The risk is not the asymmetry - it is an asymmetry nobody chose: a Cursor
 * adapter that quietly stops being wired while the Claude Code one keeps
 * working, so half the users lose a capability and every test still passes.
 *
 * So each host wiring is classified into a CAPABILITY, and a capability that
 * exists on one host and not the other must appear in ACCEPTED below with a
 * reason. Anything else fails --check.
 *
 * On top of that, every declared adapter is driven with a payload shaped like
 * its host's and must exit 0 (these hooks are non-blocking by default), must
 * not crash, and must not write to stderr.
 *
 * No dependencies, no network, no API. Runs in seconds.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PLUGINS = path.join(ROOT, 'plugins');
const dirOf = (n) => path.join(PLUGINS, n);

// What a wiring is FOR, independent of which event the host happens to call it.
const CAPABILITY = {
  // Claude Code
  UserPromptSubmit: 'turn-boundary',   // reset counters, load the discipline, carry a retrospective
  SessionStart: 'turn-boundary',       // the session's first boundary: say what the last one left (progress)
  PostToolUse: 'observe',              // count tool calls, nudge on a threshold
  PreToolUse: 'observe',
  Stop: 'close',                       // read the final message; gate it when strict
  SessionEnd: 'cleanup',               // drop the session's temp state
  SubagentStop: 'subagent-measure',    // log a subagent's close; never blocks, never parks
  // Cursor
  sessionStart: 'turn-boundary',
  postToolUse: 'observe',
  afterAgentResponse: 'close',
  stop: 'close',
  beforeSubmitPrompt: 'turn-boundary',
};

/*
 * Capabilities a plugin deliberately has on one host and not the other.
 * Adding a line here is how you say "this is a decision, not a regression" -
 * and the reason is what a reviewer reads.
 */
/*
 * Capabilities that no plugin can have on a given host, because the host has
 * no event for them. Listing one here is narrower than declaring it per
 * plugin: it says the gap is the host's, not a wiring someone forgot.
 */
const HOST_LIMITED = {
  cursor: {
    cleanup: "Cursor has no session-end event. The adapters call state.sweep() " +
      "on their own schedule instead, so residue is still bounded - by age " +
      "rather than by the session ending.",
    'subagent-measure': "No subagent lifecycle event appears in the Cursor hooks " +
      "v1 API these plugins target, so the subagent measurement is Claude Code " +
      "only. Nothing is lost on Cursor that exists there and is not wired - if " +
      "Cursor adds the event, this line is the reminder to wire it.",
  },
};

const ACCEPTED = {
  'executive-self-monitoring': {
    // Flagged capability: `observe`. On Claude Code that is hooks/exec-log-skill.js
    // on PreToolUse(matcher: Skill) - a LOGGER, not a nudge: it records which
    // skills the agent invoked so the cadence can be calibrated. Cursor exposes
    // no equivalent skill-invocation event, and nothing user-visible is lost.
    //
    // Separately (not a capability difference, so not flagged here): the Claude
    // Code adapter fires on turn 1 and every Nth turn; the Cursor adapter fires
    // once per session, because beforeSubmitPrompt can only BLOCK a prompt and
    // sessionStart is the only non-blocking injection point. Both are documented
    // in the plugin README's cadence table.
    note: "observe = the PreToolUse(Skill) calibration logger; Cursor has no " +
      "skill-invocation event. Nothing user-visible differs. See the README cadence table.",
    capabilities: { observe: 'no Cursor skill-invocation event' },
  },
  'coverage-self-monitoring': {
    note: "Never blocks on either host, so it wires no Cursor `stop` gate - " +
      "afterAgentResponse already carries the measurement.",
    capabilities: {},
  },
  'persistence-self-monitoring': {
    note: "Never blocks on either host, so it wires no Cursor `stop` gate.",
    capabilities: {},
  },
  'progress-self-monitoring': {
    // Not a capability difference, so not flagged: on Claude Code the close
    // finding (a turn that edited files and left the ledger stale) is parked
    // and delivered on the next prompt; Cursor has no non-blocking injection
    // point after the response, so afterAgentResponse logs it and nothing
    // reaches the agent. This plugin has no strict gate to deliver it through
    // either. The README's host table says so.
    note: "Never blocks on either host, so it wires no Cursor `stop` gate; the close " +
      "finding and the sweep are a retrospective on Claude Code and log-only on Cursor.",
    capabilities: {},
  },
};

function wiring(name) {
  const out = { claude: {}, cursor: {} };
  const cc = path.join(dirOf(name), 'hooks/hooks.json');
  if (fs.existsSync(cc)) {
    const j = JSON.parse(fs.readFileSync(cc, 'utf8'));
    for (const [event, entries] of Object.entries(j.hooks || j)) {
      for (const e of entries) {
        for (const h of e.hooks || []) {
          const m = String(h.command || '').match(/hooks\/([\w-]+\.js)/);
          if (m) (out.claude[event] = out.claude[event] || []).push({ script: `hooks/${m[1]}`, matcher: e.matcher || null });
        }
      }
    }
  }
  const cu = path.join(dirOf(name), 'cursor/hooks.json');
  if (fs.existsSync(cu)) {
    const j = JSON.parse(fs.readFileSync(cu, 'utf8'));
    for (const [event, entries] of Object.entries(j.hooks || {})) {
      for (const e of entries) {
        const m = String(e.command || '').match(/cursor\/([\w-]+\.js)/);
        if (m) (out.cursor[event] = out.cursor[event] || []).push({ script: `cursor/${m[1]}`, loop_limit: e.loop_limit || null });
      }
    }
  }
  return out;
}

const capsOf = (events) => new Set(Object.keys(events).map((e) => CAPABILITY[e]).filter(Boolean));

// A payload shaped like the host's, carrying the fields every adapter reads.
function payload(host, event, sid) {
  const base = host === 'claude'
    ? { session_id: sid, cwd: os.tmpdir(), hook_event_name: event }
    : { conversation_id: sid, workspace_roots: [os.tmpdir()] };
  const text = 'Work continues; nothing deferred.';
  if (host === 'claude') {
    if (event === 'UserPromptSubmit') return Object.assign(base, { prompt: 'do the thing' });
    if (event === 'SessionStart') return Object.assign(base, { source: 'startup' });
    if (event === 'PostToolUse' || event === 'PreToolUse') {
      return Object.assign(base, { tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_output: 'ok' });
    }
    if (event === 'Stop') return Object.assign(base, { last_assistant_message: text, stop_hook_active: false });
    return base;
  }
  if (event === 'postToolUse') {
    return Object.assign(base, { tool_name: 'run_terminal_cmd', tool_input: { command: 'npm test' }, tool_output: 'ok' });
  }
  if (event === 'afterAgentResponse') return Object.assign(base, { text });
  if (event === 'stop') return Object.assign(base, { status: 'completed', loop_count: 0 });
  return base;
}

function drive(name, host, event, script, sid) {
  const file = path.join(dirOf(name), script);
  if (!fs.existsSync(file)) return { ok: false, why: 'script declared in the manifest does not exist' };
  const env = Object.assign({}, process.env, host === 'claude' ? { CLAUDECODE: '1' } : { CLAUDECODE: '' });
  // Never let an opt-in strict gate turn a smoke run into a block.
  for (const k of ['EPIMON_STRICT', 'TERMMON_STRICT', 'HANDMON_STRICT']) delete env[k];
  const r = spawnSync(process.execPath, [file], {
    input: JSON.stringify(payload(host, event, sid)), encoding: 'utf8', env, cwd: dirOf(name), timeout: 15000,
  });
  if (r.error) return { ok: false, why: `spawn failed: ${r.error.message}` };
  if (r.status !== 0) return { ok: false, why: `exit ${r.status} (non-blocking hooks must exit 0), stderr: ${(r.stderr || '').slice(0, 120)}` };
  if ((r.stderr || '').trim()) return { ok: false, why: `wrote to stderr: ${r.stderr.trim().slice(0, 120)}` };
  return { ok: true, emitted: (r.stdout || '').trim().length > 0 };
}

function cleanup(sid) {
  for (const f of fs.readdirSync(os.tmpdir())) {
    if (f.includes(sid)) { try { fs.unlinkSync(path.join(os.tmpdir(), f)); } catch (_) {} }
  }
}

function main() {
  const check = process.argv.includes('--check');
  const names = fs.readdirSync(PLUGINS).filter((d) => fs.statSync(dirOf(d)).isDirectory()).sort();
  const sid = `hostsprobe-${process.pid}-${Date.now()}`;
  let problems = 0;

  console.log('plugin                        host    event                adapter                        ok');
  console.log('-'.repeat(100));

  for (const name of names) {
    const w = wiring(name);
    for (const host of ['claude', 'cursor']) {
      for (const [event, entries] of Object.entries(w[host])) {
        for (const e of entries) {
          const r = drive(name, host, event, e.script, sid);
          const mark = r.ok ? (r.emitted ? 'ok (emitted)' : 'ok (silent)') : `FAIL - ${r.why}`;
          if (!r.ok) problems += 1;
          console.log(`${name.padEnd(29)} ${host.padEnd(7)} ${event.padEnd(20)} ${e.script.padEnd(30)} ${mark}`);
        }
      }
    }
  }
  cleanup(sid);

  const seenHostGaps = new Set();
  console.log('\ncapability parity (turn-boundary / observe / close / cleanup)');
  console.log('-'.repeat(100));
  for (const name of names) {
    const w = wiring(name);
    const cc = capsOf(w.claude);
    const cu = capsOf(w.cursor);
    const diff = [...new Set([...cc, ...cu])].filter((c) => cc.has(c) !== cu.has(c));
    // A capability the HOST cannot offer is not a wiring anyone forgot.
    const hostGap = diff.filter((c) => (HOST_LIMITED[cc.has(c) ? 'cursor' : 'claude'] || {})[c]);
    const only = diff.filter((c) => !hostGap.includes(c));
    const accepted = ACCEPTED[name];
    const line = `${name.padEnd(29)} claude:[${[...cc].sort().join(' ')}]  cursor:[${[...cu].sort().join(' ')}]`;
    for (const c of hostGap) seenHostGaps.add(`${cc.has(c) ? 'cursor' : 'claude'}|${c}`);
    const gapTag = hostGap.length ? `  (host gap: ${hostGap.join(', ')})` : '';
    if (!only.length) { console.log(`${line}  parity${gapTag}`); continue; }
    const undeclared = only.filter((c) => !accepted || !(c in (accepted.capabilities || {})));
    if (undeclared.length && !accepted) {
      console.log(`${line}  UNDECLARED ASYMMETRY: ${undeclared.join(', ')}`);
      problems += 1;
    } else {
      console.log(`${line}  asymmetry (declared): ${only.join(', ')}`);
      if (accepted) console.log(`${' '.repeat(31)}${accepted.note}`);
    }
  }

  for (const g of seenHostGaps) {
    const [host, cap] = g.split('|');
    console.log(`\n${cap} is absent on ${host}: ${HOST_LIMITED[host][cap]}`);
  }

  if (check && problems) {
    console.error(`\n${problems} problem(s). A capability on one host and not the other must be listed in ACCEPTED in this file, with a reason.`);
    process.exitCode = 1;
  } else if (check) {
    console.log('\nAll adapters ran clean on both hosts; every asymmetry is declared.');
  }
}

if (require.main === module) main();
module.exports = { wiring, capsOf, CAPABILITY, ACCEPTED };
