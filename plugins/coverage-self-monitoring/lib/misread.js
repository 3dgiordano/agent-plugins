'use strict';
/*
 * The misread log: phrases the close scan read as deferred work that the
 * agent answered as a misreading (`- "<phrase>": misread - <what it was>`).
 *
 * It exists for whoever maintains the lexicon in lib/signals.js, not for the
 * person using the plugin: a user cannot change a pattern, so nothing here is
 * written unless COVMON_MISREAD_LOG is set. With it unset the dispute still
 * works - the phrase is not raised again this session and the user sees the
 * dispute - and the disk is not touched.
 *   1/true/yes/on  the disputes only
 *   all            also every phrase the scan raised, with its sentence, so a
 *                  reviewer can judge the ones nobody disputed - and every
 *                  phrase it matched in a turn that raised nothing (a block
 *                  closed it, or the turn only reported): a false positive
 *                  there is never shown to anyone, and precision needs it. That is the
 *                  trace where the agent cannot answer: on Cursor the close
 *                  scan reaches no reminder, so no misread is ever written.
 *
 * Where: outside every project, in the user's home
 * (~/.3dgiordano-agent-plugins/misreads/coverage-self-monitoring.json), so no
 * project's tree carries it and no message or skill text points at it.
 * COVMON_MISREAD_FILE overrides the path.
 *
 * Shape: one JSON document, not a JSONL stream, because entries are updated
 * in place.
 *   - One entry per (pattern, phrase): a repeat raises `raised` or
 *     `misread` and `last` rather than adding a line - the same reading
 *     seen ten times is one report with a frequency, which ranks the fixes.
 *   - Up to MAX_SAMPLES distinct contexts per entry, the newest kept: the
 *     sentences a pattern fix has to leave alone, a disputed one with the
 *     agent's reason.
 *   - At most MAX_ENTRIES entries, the most recently seen kept.
 * A dispute is the agent's word, not a verdict: an entry is a candidate for
 * the maintainer to confirm, and a confirmed one becomes a fixture in the
 * test suite before the pattern changes.
 *
 * Fails silent: a lost record costs a data point, never a turn.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { withLock } = require('./state.js');
const { phraseKey } = require('./signals.js');

const MAX_ENTRIES = 50;
const MAX_SAMPLES = 3;
const TEXT_MAX = 200;

function truthy(v) {
  v = (v || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

// 'misread' (disputes only), 'all' (disputes and raised phrases) or null.
function mode() {
  const v = (process.env.COVMON_MISREAD_LOG || '').toLowerCase();
  if (v === 'all') return 'all';
  return truthy(v) ? 'misread' : null;
}
function enabled() { return mode() !== null; }

function file() {
  return process.env.COVMON_MISREAD_FILE ||
    path.join(os.homedir(), '.3dgiordano-agent-plugins', 'misreads', 'coverage-self-monitoring.json');
}

// The same comparison the scan makes (lib/signals.js phraseKey).
const norm = phraseKey;

function clip(s) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > TEXT_MAX ? s.slice(0, TEXT_MAX - 3) + '...' : s;
}

function read(f) {
  try {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return j && Array.isArray(j.entries) ? j : { version: 1, entries: [] };
  } catch (_) { return { version: 1, entries: [] }; }
}

/*
 * merge(doc, items, now) - pure: fold readings into the document.
 * items: [{ phrase, pattern, source, context, kind: 'raised' | 'matched' | 'misread', reason }]
 * A sentence raised and then disputed is one sample, marked misread.
 */
function merge(doc, items, now) {
  const ts = new Date(typeof now === 'number' ? now : Date.now()).toISOString();
  const byKey = new Map(doc.entries.map((e) => [e.key, e]));
  for (const it of items) {
    const phrase = norm(it.phrase);
    if (!phrase) continue;
    const key = `${it.pattern}|${phrase}`;
    const kind = it.kind === 'raised' || it.kind === 'matched' ? it.kind : 'misread';
    const sample = { context: clip(it.context), kind, at: ts };
    if (kind === 'misread') sample.reason = clip(it.reason);
    let e = byKey.get(key);
    if (!e) {
      e = { key, phrase, pattern: it.pattern, source: clip(it.source), raised: 0, matched: 0, misread: 0, first: ts, last: ts, samples: [] };
      byKey.set(key, e);
    }
    e[kind] = (e[kind] || 0) + 1;
    e.last = ts;
    // A context already on file is the same report again: refresh it, do not
    // repeat it - and a dispute on file is not undone by a later raise.
    const prior = e.samples.find((x) => norm(x.context) === norm(sample.context));
    if (prior && prior.kind === 'misread' && kind !== 'misread') { sample.kind = 'misread'; sample.reason = prior.reason; }
    e.samples = e.samples.filter((x) => x !== prior);
    e.samples.push(sample);
    if (e.samples.length > MAX_SAMPLES) e.samples = e.samples.slice(-MAX_SAMPLES);
  }
  const entries = [...byKey.values()].sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : 0)).slice(0, MAX_ENTRIES);
  return { version: 1, entries };
}

function record(items, now) {
  const m = mode();
  if (!m || !Array.isArray(items)) return;
  items = items.filter((it) => m === 'all' || it.kind === 'misread');
  if (!items.length) return;
  const f = file();
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    withLock(f + '.lock', () => {
      const doc = merge(read(f), items, now);
      const tmp = `${f}.${process.pid}.tmp`;
      try {
        fs.writeFileSync(tmp, JSON.stringify(doc, null, 1));
        fs.renameSync(tmp, f);
      } catch (_) {
        try { fs.unlinkSync(tmp); } catch (_2) {}
        try { fs.writeFileSync(f, JSON.stringify(doc, null, 1)); } catch (_3) {}
      }
    });
  } catch (_) { /* never block a stop */ }
}

/*
 * What one close contributes: its disputes (answering `raised`, the phrases
 * the scan raised earlier or in this same message), and each phrase it
 * matched - `raised` when the close has no [COVERAGE CHECK] and the turn is
 * not a report, `matched` otherwise. Shared by the hooks, the runners and
 * the review script, so all three read a close the same way.
 */
function readings(res, raised, report) {
  const S = require('./signals.js');
  const kind = res.deferrals.length && !res.blocks && !report ? 'raised' : 'matched';
  return S.disputes(res.misreads, (raised || []).concat(res.found)).map((d) => Object.assign({ kind: 'misread' }, d))
    .concat(res.found.map((f) => Object.assign({ kind }, f)));
}

module.exports = { readings, enabled, mode, file, norm, merge, record, read, MAX_ENTRIES, MAX_SAMPLES };
