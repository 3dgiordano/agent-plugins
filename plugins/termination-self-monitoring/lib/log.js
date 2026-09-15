'use strict';
/*
 * Opt-in, size-bounded JSONL logging for the termination-self-monitoring hooks.
 *
 * DEBUG-ONLY: logging is OFF unless the env var TERMMON_LOG is truthy
 * (1/true/yes/on). With it off, logEvent() is a no-op -- nothing is tracked.
 *
 * When enabled the log rolls over to a single ".1" backup once it exceeds
 * MAX_BYTES, so disk use is capped at roughly 2x MAX_BYTES.
 *
 * (Deliberately a per-plugin copy rather than a shared module: each plugin in
 * the collection installs on its own and must be self-contained.)
 */

const fs = require('fs');
const path = require('path');

const MAX_BYTES = 256 * 1024;
const FILE_NAME = 'termination-self-monitoring.jsonl';

function truthy(v) {
  v = (v || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function enabled() { return truthy(process.env.TERMMON_LOG); }
function strict() { return truthy(process.env.TERMMON_STRICT); }

// Claude Code exports CLAUDECODE / CLAUDE_PLUGIN_ROOT; the Cursor adapter does
// not. TERMMON_LOG_HOST=claude|cursor overrides the detection.
function hostBaseDir() {
  const forced = (process.env.TERMMON_LOG_HOST || '').toLowerCase();
  if (forced === 'cursor') return '.cursor';
  if (forced === 'claude') return '.claude';
  if (process.env.CLAUDE_PLUGIN_ROOT || process.env.CLAUDECODE) return '.claude';
  return '.cursor';
}

function logEvent(cwd, obj) {
  if (!enabled()) return;
  if (!cwd) return; // no project dir known: never log into the plugin's own install dir
  try {
    const dir = path.join(cwd, hostBaseDir(), 'logs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, FILE_NAME);
    try {
      const st = fs.statSync(file);
      if (st.size > MAX_BYTES) fs.renameSync(file, file + '.1');
    } catch (_) { /* first write */ }
    fs.appendFileSync(file, JSON.stringify(Object.assign({ ts: new Date().toISOString() }, obj)) + '\n');
  } catch (_) { /* logging must never block a prompt or tool call */ }
}

module.exports = { logEvent, enabled, strict, hostBaseDir };
