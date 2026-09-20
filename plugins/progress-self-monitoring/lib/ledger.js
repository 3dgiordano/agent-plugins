'use strict';
/*
 * The ledger: one fixed file in the project, `.agent/progress.md`, that holds
 * what must outlive the session - the work still blocked or returned, and the
 * next action. The agent writes it with its ordinary tools. This module only
 * READS it, and reads it for two numbers: how many items are open, and how
 * old it is.
 *
 * Why a file and not a block in the message: every other plugin in this
 * collection anchors to something the agent writes into its turn, and that is
 * exactly what a session boundary drops. Residue that has to reach the next
 * session cannot live in the transcript, so this is the one plugin whose
 * artifact is on disk, and whose scanner reads the disk.
 *
 * The grammar is strict on vocabulary and tolerant on formatting. Only
 * `blocked` and `returned` count - the two closing states of the coverage
 * skill that leave a part open - and only under the `## Open` heading. But an
 * agent writing markdown decorates it: `* `, `+ `, a checkbox, bold on the
 * field name, a space before the colon, a tab of indent, CRLF. Refusing a
 * correct line over any of that is the scanner defect this collection has
 * fixed four times already (0.5.1, 0.6.0), and here a refusal is silent - a
 * miss means no reminder, and the plugin reads as never having fired.
 *
 * The hook never writes this file, never emits its content, and reads at most
 * MAX_BYTES of it.
 */

const fs = require('fs');
const path = require('path');

const LEDGER = '.agent/progress.md';
const MAX_BYTES = 64 * 1024;                // a ledger is a page, not a log
const MAX_AGE_DAYS = 14;                    // older than this, the reminder is wallpaper
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

// `## Open`, exactly level two, trailing whitespace allowed. `### Open` and
// `**Open**` are not the section: the level is part of the contract.
const OPEN_RE = /^##[ \t]+Open[ \t]*$/;
// Any heading closes the section.
const HEADING_RE = /^#{1,6}[ \t]+\S/;
// bullet, optional checkbox, optional emphasis, the token, optional emphasis, colon.
const EM = '(?:\\*\\*|__|\\*|_)?';
const ITEM_RE = new RegExp('^[ \\t]*[-*+][ \\t]+(?:\\[[ xX]?\\][ \\t]+)?' + EM + '(blocked|returned)' + EM + '[ \\t]*:', 'i');

/*
 * openItems(text) -> number of open items: `- blocked: ...` / `- returned: ...`
 * lines under `## Open`. Several `## Open` sections add up; nothing else
 * counts - not `done`, not prose, not a bullet outside the section.
 */
function openItems(text) {
  if (typeof text !== 'string' || !text) return 0;
  let n = 0;
  let inOpen = false;
  for (const line of text.split(/\r?\n/)) {
    if (OPEN_RE.test(line)) { inOpen = true; continue; }
    if (HEADING_RE.test(line)) { inOpen = false; continue; }
    if (inOpen && ITEM_RE.test(line)) n += 1;
  }
  return n;
}

function ledgerPath(cwd) {
  return cwd ? path.join(cwd, LEDGER) : null;
}

/*
 * inspect(cwd, now) -> {
 *   exists:  boolean
 *   open:    n            open items, 0 when absent
 *   mtimeMs: number|null  last write, per the filesystem
 *   ageMs:   number|null  now - mtime
 *   fresh:   boolean      exists and younger than MAX_AGE_MS
 * }
 *
 * The only project file any hook in this plugin reads. Everything about it
 * fails silent: no cwd, no file, an unreadable file and a file over MAX_BYTES
 * all come back as `exists: false` or as the numbers that could be read.
 */
function inspect(cwd, now) {
  const out = { exists: false, open: 0, mtimeMs: null, ageMs: null, fresh: false };
  const file = ledgerPath(cwd);
  if (!file) return out;
  let st;
  try { st = fs.statSync(file); } catch (_) { return out; }
  if (!st.isFile()) return out;
  out.exists = true;
  out.mtimeMs = st.mtimeMs;
  const t = typeof now === 'number' ? now : Date.now();
  out.ageMs = Math.max(0, t - st.mtimeMs);
  out.fresh = out.ageMs <= MAX_AGE_MS;
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(Math.min(st.size, MAX_BYTES));
      const read = fs.readSync(fd, buf, 0, buf.length, 0);
      out.open = openItems(buf.toString('utf8', 0, read));
    } finally { fs.closeSync(fd); }
  } catch (_) { /* unreadable: exists, open stays 0 */ }
  return out;
}

// "2 days ago", "3 hours ago", "just now" - for the message, never for a decision.
function ageText(ms) {
  if (typeof ms !== 'number' || ms < 0) return 'at an unknown time';
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'just now';
  if (h < 48) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} days ago`;
}

// Does this tool call edit the ledger itself? Read by the observe hooks so a
// turn that updated it is never asked to update it.
function isLedgerPath(p) {
  if (typeof p !== 'string' || !p) return false;
  return /(^|[\\/])\.agent[\\/]progress\.md$/.test(p.trim());
}

module.exports = { LEDGER, MAX_BYTES, MAX_AGE_DAYS, MAX_AGE_MS, openItems, inspect, ledgerPath, ageText, isLedgerPath };
