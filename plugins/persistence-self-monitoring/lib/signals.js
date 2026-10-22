'use strict';
/*
 * Persistence signals: the objective counters an agent cannot feel.
 *
 * Everything is scoped to the current *turn* (since the user's last message),
 * because a user message is where a human re-enters the loop; what happened
 * before it was already visible to them.
 *
 * Three signals, each firing exactly when its threshold is crossed (and again
 * at every multiple), never on every call:
 *   edits     - the same file edited EDITS_SAME_FILE times as an attempt: after
 *               a shell command failed since its previous edit, or on the same
 *               lines an earlier edit of it this turn changed. A file written
 *               in several edits with nothing failing between is being built,
 *               not retried, and does not count.
 *   failures  - the same shell command, or the same error signature, seen
 *               REPEAT_FAILURES times
 *   effort    - TOOL_CALLS_STEP tool calls since the user's last message
 */

const EDITS_SAME_FILE = 4;
const REPEAT_FAILURES = 3;
const TOOL_CALLS_STEP = 30;
const MAX_KEYS = 64; // bound the per-turn maps so state can never grow unboundedly

const { outputText, looksFailed, errorSignature } = require('./fail.js');

const EDIT_TOOL_RE = /edit|write|notebook|patch|replace|create_file|apply_diff/i;
const SHELL_TOOL_RE = /bash|shell|terminal|command|exec|powershell/i;

function freshTurn() {
  return { tools: 0, edits: {}, cmds: {}, errs: {}, fails: 0, seen: {}, regions: {}, fired: { effort: 0, edits: {}, cmds: {}, errs: {} } };
}

function bump(map, key) {
  if (!(key in map) && Object.keys(map).length >= MAX_KEYS) return 0;
  map[key] = (map[key] || 0) + 1;
  return map[key];
}

// Fire once per threshold crossing: at N, 2N, 3N...
function crossed(count, threshold, firedMap, key) {
  if (count < threshold || count % threshold !== 0) return false;
  if (firedMap[key] === count) return false;
  firedMap[key] = count;
  return true;
}

function filePathOf(input) {
  if (!input || typeof input !== 'object') return null;
  for (const k of ['file_path', 'path', 'notebook_path', 'target_file', 'filePath', 'file']) {
    if (typeof input[k] === 'string' && input[k]) return input[k];
  }
  return null;
}

// The lines an edit replaces, when the tool says: Edit's old_string, each of MultiEdit's.
function regionsOf(input) {
  if (!input || typeof input !== 'object') return [];
  const olds = typeof input.old_string === 'string' ? [input.old_string]
    : Array.isArray(input.edits) ? input.edits.map((e) => e && e.old_string).filter((x) => typeof x === 'string') : [];
  return olds.map((o) => o.trim().replace(/\s+/g, ' ').slice(0, 200)).filter(Boolean);
}

/*
 * How many attempts this edit of f adds (see the header), recorded as it
 * goes: 0 for an edit that builds, 1 for a retry, and 2 for the first retry
 * after an edit that did not count - the edit it retries was the first
 * attempt. A turn from before these fields counts every edit, as before.
 */
function attempts(turn, f, input) {
  if (typeof turn.fails !== 'number') return 1;
  if (!turn.seen) turn.seen = {};
  if (!turn.regions) turn.regions = {};
  if (!(f in turn.seen) && Object.keys(turn.seen).length >= MAX_KEYS) return 0;
  const earlier = f in turn.seen;
  const afterFailure = turn.fails > (earlier ? turn.seen[f] : 0);
  turn.seen[f] = turn.fails;
  const was = turn.regions[f] || [];
  const regions = regionsOf(input);
  const again = regions.some((r) => was.includes(r));
  turn.regions[f] = was.concat(regions.filter((r) => !was.includes(r))).slice(-16);
  if (!afterFailure && !again) return 0;
  return earlier && !turn.edits[f] ? 2 : 1;
}

function commandOf(input) {
  if (!input || typeof input !== 'object') return null;
  const c = input.command || input.cmd || input.script;
  return typeof c === 'string' && c ? c.trim().replace(/\s+/g, ' ').slice(0, 200) : null;
}

/*
 * Record one tool call into the turn state and return the list of signals
 * that fired: [{kind:'edits', key, count}, {kind:'cmds'|'errs', key, count}, {kind:'effort', count}]
 */
function observe(turn, toolName, toolInput, toolOutput) {
  const fired = [];
  const name = String(toolName || '');

  turn.tools += 1;
  if (crossed(turn.tools, TOOL_CALLS_STEP, turn.fired, 'effort')) fired.push({ kind: 'effort', count: turn.tools });

  if (EDIT_TOOL_RE.test(name)) {
    const f = filePathOf(toolInput);
    for (let k = f ? attempts(turn, f, toolInput) : 0; k > 0; k--) {
      const n = bump(turn.edits, f);
      if (crossed(n, EDITS_SAME_FILE, turn.fired.edits, f)) fired.push({ kind: 'edits', key: f, count: n });
    }
  }

  if (SHELL_TOOL_RE.test(name)) {
    const out = outputText(toolOutput).slice(0, 6000);
    if (looksFailed(out)) {
      if (typeof turn.fails === 'number') turn.fails += 1;
      const c = commandOf(toolInput);
      if (c) {
        const n = bump(turn.cmds, c);
        if (crossed(n, REPEAT_FAILURES, turn.fired.cmds, c)) fired.push({ kind: 'cmds', key: c, count: n });
      }
      const sig = errorSignature(out);
      if (sig) {
        const n = bump(turn.errs, sig);
        // The signature keys the count and goes to the log. It is a line of
        // the command's output - text a test, a file or a service can write -
        // so the message names the command it came from, never the line.
        if (crossed(n, REPEAT_FAILURES, turn.fired.errs, sig)) fired.push({ kind: 'errs', key: sig, count: n, cmd: c || null });
      }
    }
  }
  return fired;
}

/*
 * A subagent handed back to the main agent (the main agent's PostToolUse of the
 * tool that ran it): what the subagent's turn counted since the last hand-back
 * joins the main agent's turn, one by one, through the same thresholds - the
 * same failure retried by a subagent the main agent re-delegates to is the
 * main agent's loop too. `done` is what was already folded from this subagent
 * (kept in the main agent's record, changed in place). Returns the signals
 * fired, marked `delegated`.
 */
function relay(turn, sub, done) {
  const fired = [];
  if (!turn || !sub || !done) return fired;
  const gain = (now, then) => Math.max(0, (now || 0) - (then || 0));
  for (let i = gain(sub.tools, done.tools); i > 0; i--) {
    turn.tools += 1;
    if (crossed(turn.tools, TOOL_CALLS_STEP, turn.fired, 'effort')) fired.push({ kind: 'effort', count: turn.tools, delegated: true });
  }
  const fold = (kind, limit, extra) => {
    const was = done[kind] || {};
    for (const [k, now] of Object.entries(sub[kind] || {})) {
      for (let i = gain(now, was[k]); i > 0; i--) {
        const n = bump(turn[kind], k);
        if (n && crossed(n, limit, turn.fired[kind], k)) fired.push(Object.assign({ kind, key: k, count: n, delegated: true }, extra || {}));
      }
    }
  };
  fold('edits', EDITS_SAME_FILE);
  fold('cmds', REPEAT_FAILURES);
  fold('errs', REPEAT_FAILURES, { cmd: null });
  Object.assign(done, { tools: sub.tools || 0, edits: Object.assign({}, sub.edits), cmds: Object.assign({}, sub.cmds), errs: Object.assign({}, sub.errs) });
  return fired;
}

// The tool that runs a subagent, as the main agent's PostToolUse names it.
const SUBAGENT_TOOL_RE = /^(?:agent|task)$/i;

// Compact per-turn summary for the log.
function summary(turn) {
  const max = (m) => Object.keys(m).reduce((a, k) => Math.max(a, m[k]), 0);
  return { tools: turn.tools, maxEditsSameFile: max(turn.edits), maxRepeatCmd: max(turn.cmds), maxRepeatErr: max(turn.errs) };
}

module.exports = { freshTurn, observe, relay, summary, EDITS_SAME_FILE, REPEAT_FAILURES, TOOL_CALLS_STEP, SUBAGENT_TOOL_RE };
