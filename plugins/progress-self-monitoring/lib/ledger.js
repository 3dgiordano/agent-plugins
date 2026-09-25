'use strict';
/*
 * The ledger: one fixed file in the project, `.agent/progress.md`, that holds
 * what must outlive the session - the work still blocked or returned, and the
 * next action. The agent writes it with its ordinary tools. This module only
 * READS it, and reads it for numbers: how many items are open, of which
 * kind, whether it names a next action, how many lines are not its format,
 * and how old it is.
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
/*
 * A ledger holds residue, and residue is closed by being removed. Left to
 * itself it grows the other way: closed items marked instead of dropped, a
 * "## Done" section as a diary, and a file the next session has to read
 * around. Two counts say when that has happened - more open items than a
 * session can carry, or more lines than a page - and the status message
 * says so. Reasoned, not measured; calibrate.js prints the distributions.
 */
const MAX_OPEN_ITEMS = 8;
const MAX_LINES = 40;

// `## Open`, exactly level two, trailing whitespace allowed. `### Open` and
// `**Open**` are not the section: the level is part of the contract.
const OPEN_RE = /^##[ \t]+Open[ \t]*$/;
// Any heading closes the section.
const HEADING_RE = /^#{1,6}[ \t]+\S/;
// bullet, optional checkbox, optional emphasis, the token, optional emphasis, colon.
const EM = '(?:\\*\\*|__|\\*|_)?';
const ITEM_RE = new RegExp('^[ \\t]*[-*+][ \\t]+(?:\\[[ xX]?\\][ \\t]+)?' + EM + '(blocked|returned)' + EM + '[ \\t]*:', 'i');

// The rest of the format (SKILL.md "The ledger"): the title, the two fields
// and Next, with the same tolerance on emphasis and spacing as an item.
const TITLE_RE = /^#[ \t]+Progress[ \t]*$/i;
const FIELD_RE = new RegExp('^[ \\t]*' + EM + '(Updated|Plan|Next)' + EM + '[ \\t]*:[ \\t]*(.*)$', 'i');
// A Next that names no action is no Next.
const EMPTY_NEXT_RE = /^(?:none|nothing|-)?\.?$/i;
const MAX_FOREIGN_LINES = 5; // line numbers kept for the message; the count is exact

/*
 * census(text) -> {
 *   blocked, returned: n   items under `## Open` (several sections add up)
 *   next:    boolean       a `Next:` line that names an action
 *   foreign: n             non-blank lines outside the format
 *   foreignLines: [n]      the first MAX_FOREIGN_LINES of them, 1-based
 * }
 *
 * Every non-blank line is either the format or foreign. A foreign line - a
 * `## Done` section, a `- done:` item, prose, a made-up `- [urgent]:` marker -
 * is counted and located, never read further: its text is not a field, and
 * a count is the only thing about it the message carries.
 */
function census(text) {
  const out = { blocked: 0, returned: 0, next: false, foreign: 0, foreignLines: [] };
  if (typeof text !== 'string' || !text) return out;
  let inOpen = false;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (OPEN_RE.test(line)) { inOpen = true; continue; }
    if (TITLE_RE.test(line)) { inOpen = false; continue; }
    let m;
    if (inOpen && (m = line.match(ITEM_RE))) { out[m[1].toLowerCase()] += 1; continue; }
    if ((m = line.match(FIELD_RE))) {
      if (m[1].toLowerCase() === 'next' && !EMPTY_NEXT_RE.test(m[2].trim())) out.next = true;
      continue;
    }
    if (HEADING_RE.test(line)) inOpen = false;
    out.foreign += 1;
    if (out.foreignLines.length < MAX_FOREIGN_LINES) out.foreignLines.push(i + 1);
  }
  return out;
}

/*
 * openItems(text) -> number of open items: `- blocked: ...` / `- returned: ...`
 * lines under `## Open`. Nothing else counts - not `done`, not prose, not a
 * bullet outside the section.
 */
function openItems(text) {
  const c = census(text);
  return c.blocked + c.returned;
}

function ledgerPath(cwd) {
  return cwd ? path.join(cwd, LEDGER) : null;
}

/*
 * inspect(cwd, now) -> {
 *   exists:  boolean
 *   absent:  boolean      the project is known and has no ledger (not: unreadable)
 *   open:    n            open items, 0 when absent (blocked + returned)
 *   blocked, returned, next, foreign, foreignLines: see census()
 *   lines:   n            non-blank lines (of the first MAX_BYTES)
 *   bytes:   n            file size
 *   mtimeMs: number|null  last write, per the filesystem
 *   ageMs:   number|null  now - mtime
 *   fresh:   boolean      exists and younger than MAX_AGE_MS
 *   bloated: [string]     what is over its cap: 'open' | 'lines' | 'bytes'
 * }
 *
 * The only project file any hook in this plugin reads. Everything about it
 * fails silent: no cwd, no file, an unreadable file and a file over MAX_BYTES
 * all come back as `exists: false` or as the numbers that could be read.
 *
 * No text of the file leaves this function: counts, line numbers and a
 * timestamp only.
 * Release 0.3.1 quoted the ledger's `Next:` line into the session-start
 * message, so a project file reached the model with a hook's authority - a
 * cloned repository could put an instruction there. Removed in 0.5.0; the
 * agent reads the file itself, as a file.
 */
function inspect(cwd, now) {
  const out = { exists: false, absent: false, open: 0, blocked: 0, returned: 0, next: false, foreign: 0, foreignLines: [], lines: 0, bytes: 0, mtimeMs: null, ageMs: null, fresh: false, bloated: [] };
  const file = ledgerPath(cwd);
  if (!file) return out;
  let st;
  try { st = fs.statSync(file); } catch (e) { out.absent = !!(e && e.code === 'ENOENT'); return out; }
  if (!st.isFile()) return out;
  out.exists = true;
  out.bytes = st.size;
  out.mtimeMs = st.mtimeMs;
  const t = typeof now === 'number' ? now : Date.now();
  out.ageMs = Math.max(0, t - st.mtimeMs);
  out.fresh = out.ageMs <= MAX_AGE_MS;
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(Math.min(st.size, MAX_BYTES));
      const read = fs.readSync(fd, buf, 0, buf.length, 0);
      const text = buf.toString('utf8', 0, read);
      Object.assign(out, census(text));
      out.open = out.blocked + out.returned;
      out.lines = text.split(/\r?\n/).filter((l) => l.trim()).length;
    } finally { fs.closeSync(fd); }
  } catch (_) { /* unreadable: exists, open stays 0 */ }
  if (out.open > MAX_OPEN_ITEMS) out.bloated.push('open');
  if (out.lines > MAX_LINES) out.bloated.push('lines');
  if (out.bytes > MAX_BYTES) out.bloated.push('bytes');
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

module.exports = { LEDGER, MAX_BYTES, MAX_AGE_DAYS, MAX_AGE_MS, MAX_OPEN_ITEMS, MAX_LINES, census, openItems, inspect, ledgerPath, ageText, isLedgerPath };
