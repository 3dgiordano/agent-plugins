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
 *   edits     - the same file edited EDITS_SAME_FILE times
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
  return { tools: 0, edits: {}, cmds: {}, errs: {}, fired: { effort: 0, edits: {}, cmds: {}, errs: {} } };
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
    if (f) {
      const n = bump(turn.edits, f);
      if (crossed(n, EDITS_SAME_FILE, turn.fired.edits, f)) fired.push({ kind: 'edits', key: f, count: n });
    }
  }

  if (SHELL_TOOL_RE.test(name)) {
    const out = outputText(toolOutput).slice(0, 6000);
    if (looksFailed(out)) {
      const c = commandOf(toolInput);
      if (c) {
        const n = bump(turn.cmds, c);
        if (crossed(n, REPEAT_FAILURES, turn.fired.cmds, c)) fired.push({ kind: 'cmds', key: c, count: n });
      }
      const sig = errorSignature(out);
      if (sig) {
        const n = bump(turn.errs, sig);
        if (crossed(n, REPEAT_FAILURES, turn.fired.errs, sig)) fired.push({ kind: 'errs', key: sig, count: n });
      }
    }
  }
  return fired;
}

// Compact per-turn summary for the log.
function summary(turn) {
  const max = (m) => Object.keys(m).reduce((a, k) => Math.max(a, m[k]), 0);
  return { tools: turn.tools, maxEditsSameFile: max(turn.edits), maxRepeatCmd: max(turn.cmds), maxRepeatErr: max(turn.errs) };
}

module.exports = { freshTurn, observe, summary, EDITS_SAME_FILE, REPEAT_FAILURES, TOOL_CALLS_STEP };
