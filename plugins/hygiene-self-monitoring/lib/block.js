'use strict';
/*
 * The close, read against what the session's edits reached.
 *
 * The [HYGIENE CHECK] block is a markdown list under its marker: Request
 * names, Change reaches, Outside, Decision. Three findings, each read off the
 * block's own fields and the edit record (lib/signals.js), never off the
 * code's meaning:
 *   - no block, while the edits reached two or more public functions;
 *   - Outside names something, and the Decision keeps it;
 *   - Outside is none, while a public function the edits reached is named
 *     nowhere in Request names (any of its aliases, or a method's own name,
 *     counts as named);
 *   - Outside names something and the Decision puts it back (revert-extra) or
 *     to the owner (ask-owner), while a public function the edits reached and
 *     Request names does not name is still changed.
 * A finding carries paths, line numbers and counts - never the names, never
 * the message's text.
 */

const MARKER = /\[HYGIENE CHECK\]/i;
const FIELDS = {
  request: /^request names?$/i,
  reach: /^change reaches?$/i,
  outside: /^outside$/i,
  decision: /^decision$/i,
};
// "none" as the first word, and then whatever gloss: "none (x and y are
// unchanged)", "none - z is offered above, not made", "none in the code. z is
// offered". Not when the gloss carves an exception out of it ("none except
// z", "nothing but z"): that names z. "nonetheless" is not "none".
const NONE_WORD = /^(?:none|nothing|n\/a|ninguno|ninguna|nada)(?![\w/])/i;
const EXCEPT = /^[^.;]*?\b(?:except|but|besides|apart from|other than|save for|excepto|salvo|menos|aparte de|sino)\b/i;

function parse(text) {
  if (typeof text !== 'string') return null;
  const lines = text.split(/\r?\n/);
  let at = -1;
  for (let i = 0; i < lines.length; i++) if (MARKER.test(lines[i])) at = i;
  if (at === -1) return null;
  const out = {};
  for (let i = at + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) break;
    const m = l.match(/^\s*[-*]\s*\**([A-Za-z][A-Za-z ]*?)\**\s*:\s*(.*)$/);
    if (!m) continue;
    for (const [k, re] of Object.entries(FIELDS)) if (re.test(m[1].trim()) && out[k] === undefined) out[k] = m[2].trim();
  }
  return out;
}

const clean = (s) => String(s || '').replace(/[`*_]/g, '').trim();
const isNone = (s) => {
  const c = clean(s);
  return c === '' || /^[-—]\s*$/.test(c) || (NONE_WORD.test(c) && !EXCEPT.test(c));
};
const decisionOf = (s) => (clean(s).match(/^(keep|revert-extra|ask-owner)\b/i) || [])[1];

function named(group, requestText) {
  const req = String(requestText || '');
  return group.names.some((n) => {
    const short = n.includes('#') ? n.slice(n.indexOf('#') + 1) : n;
    // The name, or the name inflected as prose does: "a deleted key" names delete.
    return new RegExp(`(^|[^\\w$])${short.replace(/[$]/g, '\\$')}(?:s|es|d|ed|ing)?([^\\w$]|$)`, 'i').test(req);
  });
}

// File by file, with the lines; a file a subagent changed says so (lib/signals.js reachedWith).
function where(groups) {
  const byFile = new Map();
  const bySub = new Set();
  for (const g of groups) {
    if (!byFile.has(g.file)) byFile.set(g.file, []);
    if (g.line) byFile.get(g.file).push(g.line);
    if (g.by === 'subagent') bySub.add(g.file);
  }
  return [...byFile].map(([f, ls]) => (ls.length ? `${f} line${ls.length > 1 ? 's' : ''} ${ls.join(', ')}` : f) + (bySub.has(f) ? ', by a subagent' : '')).join('; ');
}

/*
 * scan(text, reached) -> { block, violations }. `reached` is the edit
 * record: [{ file, line, names, how }].
 */
function scan(text, reached) {
  const groups = Array.isArray(reached) ? reached : [];
  const b = parse(text);
  const violations = [];
  if (!b) {
    if (groups.length >= 2) violations.push(`no [HYGIENE CHECK], while this session's edits changed the code of ${groups.length} public functions (${where(groups)})`);
    return { block: false, violations };
  }
  const decision = decisionOf(b.decision);
  // The block's own contradictions: it names a change outside the request and
  // keeps it, or says it put back or offered what the code still has.
  const kept = !isNone(b.outside) && Boolean(decision) && decision.toLowerCase() === 'keep';
  if (kept) {
    violations.push('Outside names a change and the Decision is keep - if it is outside the request, it goes back as it was (revert-extra) or to the owner (ask-owner); if the request needs it, show it by a run - a fix that changes only what the request names fails the request\'s own example - and then it moves to Request names');
  }
  const unnamed = groups.filter((g) => g.how !== 'added' && !named(g, b.request));
  const count = `${unnamed.length} public function${unnamed.length > 1 ? 's' : ''} this session changed ${unnamed.length > 1 ? 'are' : 'is'}`;
  if (isNone(b.outside)) {
    if (unnamed.length) violations.push(`Outside is none, while ${count} not in Request names (${where(unnamed)})`);
  }
  // The record is the code as it stands: a function put back is no longer in it.
  const unreverted = !isNone(b.outside) && Boolean(decision) && decision.toLowerCase() !== 'keep' && unnamed.length > 0;
  if (unreverted) {
    violations.push(`the Decision is ${decision.toLowerCase()}, while ${count} still changed and not in Request names (${where(unnamed)}) - put back means the code is as it was, and ask-owner puts it back too; if the request needs a change, show it by a run - a fix that changes only what the request names fails the request's own example - and then it moves to Request names`);
  }
  // What the Stop holds in either mode (hooks/hyg-stop.js): a kept Outside the
  // record bears out - a public function changed that Request names does not
  // name. Read off the record, not the wording, so a loose gloss of "none"
  // over a clean record stays a note. A put-back the record still shows is a
  // note too: the record spans the session, so a function an earlier request
  // changed, or one put back from the shell, is still in it.
  return { block: true, decision: decision || null, kept, contradicts: kept && unnamed.length > 0, violations };
}

module.exports = { parse, scan };
