'use strict';
/*
 * Shared, opt-in, size-bounded logging for the executive-self-monitoring hooks.
 *
 * DEBUG-ONLY: logging is OFF unless the env var EXECMON_LOG is truthy
 * (1/true/yes/on). Core functionality (the cadence reminder) never depends on
 * this. With logging off, logEvent() is a no-op -- we do NOT track sessions.
 *
 * When enabled, the log is bounded: once it exceeds MAX_BYTES it is rolled over
 * to a single ".1" backup (older backup overwritten), so disk use is capped at
 * roughly 2x MAX_BYTES and can never grow indefinitely.
 */

const fs = require('fs');
const path = require('path');

const MAX_BYTES = 256 * 1024; // rotate when the active log exceeds this
const FILE_NAME = 'executive-self-monitoring.jsonl';

function enabled() {
  const v = (process.env.EXECMON_LOG || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

// Which host is running this hook -> which folder to log under.
// Claude Code exports CLAUDECODE (and CLAUDE_PLUGIN_ROOT for plugin hooks); the
// Cursor port runs without those. EXECMON_LOG_HOST overrides if ever needed.
function hostBaseDir() {
  const forced = (process.env.EXECMON_LOG_HOST || '').toLowerCase();
  if (forced === 'cursor') return '.cursor';
  if (forced === 'claude') return '.claude';
  if (process.env.CLAUDE_PLUGIN_ROOT || process.env.CLAUDECODE) return '.claude';
  return '.cursor';
}

function logEvent(cwd, obj) {
  if (!enabled()) return; // debug-only: no logging unless explicitly turned on
  if (!cwd) return; // no project dir known: never log into the plugin's own install dir
  try {
    const dir = path.join(cwd, hostBaseDir(), 'logs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, FILE_NAME);
    try {
      const st = fs.statSync(file);
      if (st.size > MAX_BYTES) fs.renameSync(file, file + '.1'); // single rollover
    } catch (_) { /* file may not exist yet */ }
    const line = JSON.stringify(Object.assign({ ts: new Date().toISOString() }, obj)) + '\n';
    fs.appendFileSync(file, line);
  } catch (_) { /* logging must never block a prompt or tool call */ }
}

module.exports = { logEvent, enabled, hostBaseDir };
