'use strict';
/*
 * Progress signals: what the hooks count so the reminder can be rare.
 *
 * The ledger tells the next session what this one left open. The failure this
 * plugin exists for is the ledger not being there, or being there and stale:
 * a turn that moved the work and did not move the record. Neither is visible
 * from inside the turn - a file the agent did not touch does not announce
 * itself - so the hooks keep two things per turn and read one thing from disk:
 *
 *   edits          tool calls that wrote a file this turn
 *   ledgerEdited   one of them wrote the ledger itself
 *   inspect()      the ledger's open-item count and mtime (lib/ledger.js)
 *
 * and fire the STALE signal at the close of a turn only when all of these
 * hold:
 *
 *   - the ledger exists and has open items    (there is a record to keep)
 *   - the turn edited files                   (the work moved)
 *   - the ledger was not written this turn    (the record did not)
 *   - it has not fired for this ledger version already
 *
 * The last rule is what keeps it a signal: it fires once per stale period, and
 * arms again only when the ledger changes. Without it, ten turns of questions
 * next to an old ledger would be ten reminders.
 */

const { isLedgerPath } = require('./ledger.js');

const EDIT_TOOL_RE = /edit|write|notebook|patch|replace|create_file|apply_diff/i;

function freshTurn() {
  return { tools: 0, edits: 0, ledgerEdited: false };
}

function filePathOf(input) {
  if (!input || typeof input !== 'object') return null;
  for (const k of ['file_path', 'path', 'notebook_path', 'target_file', 'filePath', 'file']) {
    if (typeof input[k] === 'string' && input[k]) return input[k];
  }
  return null;
}

// Record one tool call into the turn. Returns nothing: this plugin never
// nudges from an observe hook; the counters are read at the turn's close.
function observe(turn, toolName, toolInput) {
  turn.tools += 1;
  if (!EDIT_TOOL_RE.test(String(toolName || ''))) return;
  turn.edits += 1;
  if (isLedgerPath(filePathOf(toolInput))) turn.ledgerEdited = true;
}

/*
 * stale(turn, ins, turnStartMs, flaggedMtime) -> { stale, fire }
 *
 *   stale  the ledger has open items and this turn's edits did not touch it
 *   fire   stale, and not already flagged for this ledger version
 *
 * mtime is the primary witness and the edit counter the second: either one
 * saying "written this turn" is enough, so a filesystem that reports a coarse
 * mtime still gets the answer right when the hook saw the write.
 */
function stale(turn, ins, turnStartMs, flaggedMtime) {
  const t = turn || freshTurn();
  const out = { stale: false, fire: false };
  if (!ins || !ins.exists || ins.open < 1) return out;
  if (t.edits < 1) return out;
  const written = t.ledgerEdited || (typeof turnStartMs === 'number' && typeof ins.mtimeMs === 'number' && ins.mtimeMs >= turnStartMs);
  if (written) return out;
  out.stale = true;
  out.fire = flaggedMtime !== ins.mtimeMs;
  return out;
}

function summary(turn) {
  const t = turn || freshTurn();
  return { tools: t.tools, edits: t.edits, ledgerEdited: t.ledgerEdited };
}

/*
 * spansSessions(prompt) -> does the USER say this work continues in a later
 * session?
 *
 * The one signal about residue that is decidable on arrival. The load message
 * alone was measured at 1 of 3 on the case this exists for: two runs wrote
 * "cannot be exercised until you set the token in a later session" in the
 * reply and persisted nothing - they knew it was residue, and the reply is
 * where they put it. The owner had said "later session" in the prompt; nothing
 * read it. This does, and the prompt hook answers with the file's name.
 *
 * English only, like the other detectors; the phrases are the boundary said
 * out loud, and "session" in every other sense (a cookie, a store, an id,
 * "this session") is a corpus miss. Fenced and inline code are stripped so
 * a prompt quoting `sessionStorage` is not a hit.
 */
const SPANS_RE = [
  /\b(?:later|next|another|future|separate|new|follow-up|previous|last|prior|earlier)\s+sessions?\b/i,
  /\b(?:across|over|spans?|spanning|between)\s+(?:a\s+few\s+|several\s+|multiple\s+|two\s+|\d+\s+)?sessions\b/i,
  /\bmulti-?session\b/i,
  /\bwe(?:'ll| will) (?:continue|pick (?:this|it) (?:back )?up|resume|carry on)\b[^.!?\n]{0,30}\b(?:later|tomorrow|next (?:time|week|session)|another (?:day|time))\b/i,
  /\bpick (?:this|it) (?:back )?up (?:later|tomorrow|next (?:time|week|session))\b/i,
  /\bnext time\b/i,
];

function spansSessions(prompt) {
  if (typeof prompt !== 'string' || !prompt) return false;
  const t = prompt.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ');
  return SPANS_RE.some((re) => re.test(t));
}

module.exports = { freshTurn, observe, stale, summary, spansSessions, EDIT_TOOL_RE };
