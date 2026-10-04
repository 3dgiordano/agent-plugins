'use strict';
/*
 * Claims: several sessions on one ledger.
 *
 * A session that starts on an open item writes a claim line under it - its
 * token, when it took the item, when it last renewed, until when the claim
 * holds without a renewal, where the work is and the last step. A claim past
 * its `until` is a session that could not go on: another one may take the
 * item over and continue from `at` and `step`.
 *
 * There is no lock. The ledger is a markdown file every session edits with
 * its ordinary tools, so two can claim one item at once. The protocol makes
 * that safe rather than impossible: each session edits only its own line,
 * re-reads, and holds the item only when its line is the item's one live
 * claim - any other, and it backs off. Two that write together may both back
 * off; neither ends up holding the item twice. A takeover replaces the dead
 * line by its exact text, so a renewal in between makes the edit miss.
 *
 * The renewal is the agent's, not a hook's: a claim renewed by hand says the
 * work moved, where one renewed on every tool call would only say the process
 * was alive. What the hooks add is what the agent cannot see from inside the
 * turn - its claim about to run out, already run out, gone, or not alone -
 * read off the file, said once each, as counts and line numbers.
 *
 * This module decides nothing about the file's text beyond what census()
 * parsed; it never reads or writes the ledger.
 */

// Past `until` by more than this, a claim is dead and may be taken over: room
// for two clocks that disagree, and for a renewal already on its way.
const GRACE_MS = 5 * 60 * 1000;
// Own claim running out within this: say so, once per `until`.
const WARN_BEFORE_MS = 10 * 60 * 1000;

/*
 * The session's token: `c` and 7 hex characters of a hash of the session id. The
 * same session gets the same token after a compaction or a resume, which is
 * how it recognises its own line; the id itself never reaches the file.
 * FNV-1a, not a cryptographic hash: the token only has to tell a handful of
 * sessions apart, and the hooks load no module beyond fs, os and path.
 */
function token(sessionId) {
  if (!sessionId || sessionId === 'nosession' || sessionId === 'noconversation') return null;
  let h = 0x811c9dc5;
  for (const ch of String(sessionId)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'c' + h.toString(16).padStart(8, '0').slice(-7);
}

/*
 * tally(claims, now, mine) -> {
 *   total: n                              every claim
 *   mine: [{ line, item, until }]         this session's, live or not
 *   live, dead, unreadable: n             the other sessions', by state
 *   deadLines, unreadableLines: [n]       where (1-based)
 *   contested: [n]                        items with two or more live claims, anyone's (the item's line)
 * }
 * live: `until` + GRACE_MS not yet passed. dead: passed. unreadable: no
 * `until` with a zone - neither, and only its writer can fix it.
 */
function tally(claims, now, mine) {
  const out = { total: 0, mine: [], live: 0, dead: 0, unreadable: 0, deadLines: [], unreadableLines: [], contested: [] };
  const t = typeof now === 'number' ? now : Date.now();
  const liveByItem = new Map();
  for (const c of claims || []) {
    out.total += 1;
    const state = c.until === null ? 'unreadable' : t > c.until + GRACE_MS ? 'dead' : 'live';
    if (state === 'live') liveByItem.set(c.item, (liveByItem.get(c.item) || 0) + 1);
    if (mine && c.token === mine) { out.mine.push({ line: c.line, item: c.item, until: c.until }); continue; }
    out[state] += 1;
    if (state === 'dead') out.deadLines.push(c.line);
    if (state === 'unreadable') out.unreadableLines.push(c.line);
  }
  for (const [item, n] of liveByItem) if (n > 1) out.contested.push(item);
  out.contested.sort((a, b) => a - b);
  return out;
}

/*
 * check(prev, ins, now, mine, selfEdit) -> { kind, line, item, minutes, n } | null
 *
 * What to tell this session about its own claims, from the ledger as it is
 * now and what it held last time (`prev`, from session state: { held }).
 * One finding, the most urgent first:
 *   gone       it held a claim and the ledger has none of its lines, and the
 *              change was not its own edit - another session took the item
 *              over, or a rewrite erased the line
 *   contested  its live claim shares the item with another live claim
 *   expired    its claim is past `until`
 *   expiring   its claim runs out within WARN_BEFORE_MS
 *   several    it holds more than one live claim
 * The caller says each finding once (see key()).
 */
function check(prev, ins, now, mine, selfEdit) {
  if (!mine || !ins || !ins.exists) return null;
  const t = typeof now === 'number' ? now : Date.now();
  const tl = tally(ins.claims, t, mine);
  const had = !!(prev && prev.held);
  if (!tl.mine.length) return had && !selfEdit ? { kind: 'gone' } : null;
  for (const c of tl.mine) {
    if (c.until !== null && t <= c.until + GRACE_MS && tl.contested.includes(c.item)) return { kind: 'contested', line: c.line, item: c.item };
  }
  const timed = tl.mine.filter((c) => c.until !== null).sort((a, b) => a.until - b.until);
  for (const c of timed) {
    if (t > c.until) return { kind: 'expired', line: c.line, until: c.until, minutes: Math.max(1, Math.round((t - c.until) / 60000)) };
    if (c.until - t <= WARN_BEFORE_MS) return { kind: 'expiring', line: c.line, until: c.until, minutes: Math.max(1, Math.round((c.until - t) / 60000)) };
  }
  const live = timed.filter((c) => t <= c.until + GRACE_MS).length;
  if (live > 1) return { kind: 'several', n: live };
  return null;
}

// Once per finding: a renewal changes `until`, a new item changes the line.
function key(f) {
  if (!f) return '';
  return [f.kind, f.line || '', f.until || '', f.item || '', f.n || ''].join(':');
}

// Does this session hold a claim in the ledger now? Kept in state so the
// observe hook reads the file only while there is a claim to watch.
function holds(ins, mine) {
  if (!mine || !ins || !ins.exists) return false;
  return (ins.claims || []).some((c) => c.token === mine);
}

/*
 * watch(st, ins, now, mine, selfEdit) -> finding | null
 * check(), said once: the session state keeps whether a claim was held and
 * the findings already said. A claim taken again clears the old "gone", so
 * losing it a second time is said too.
 */
function watch(st, ins, now, mine, selfEdit) {
  const prev = st.claim || {};
  const f = check(prev, ins, now, mine, selfEdit);
  const held = holds(ins, mine);
  let said = Array.isArray(prev.said) ? prev.said : [];
  if (held) said = said.filter((k) => k.indexOf('gone:') !== 0);
  const k = key(f);
  const fresh = !!f && !said.includes(k);
  st.claim = { held, said: fresh ? said.concat(k).slice(-20) : said };
  return fresh ? f : null;
}

module.exports = { GRACE_MS, WARN_BEFORE_MS, token, tally, check, key, holds, watch };
