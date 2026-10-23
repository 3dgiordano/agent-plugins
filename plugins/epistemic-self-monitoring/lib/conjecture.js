'use strict';
/*
 * The agent's own conjectures, as it marked them: an inline [conjecture] tag,
 * or an [EPISTEMIC CLOSE] block whose Status is conjecture (lib/scan.js).
 *
 * A shell result that arrives after such a mark is the moment the claim can be
 * tested, and the moment a first explanation hardens into a fact when nobody
 * asks. The marks are the trigger because the agent wrote them: no lexicon of
 * claim phrases guesses at what a sentence asserts. A claim the agent did not
 * mark is not seen here - the failed-command nudge is the only one it gets.
 *
 * Claude Code: the agent's text is read from the end of the session
 * transcript, back to the owner's last prompt - a mark written earlier in this
 * turn is not in any hook event. A subagent's text is in its own transcript,
 * beside the session's: <session>/subagents/agent-<agent id>.jsonl. What is
 * kept is the id of the latest entry that carries a mark; no text is kept or
 * said back.
 *
 * A mark in the close of the previous turn is behind the owner's prompt, so the
 * Stop hook carries it instead (`carry` in the session state), for the first
 * result of the next turn. Cursor gives a hook only the agent's final text, so
 * there the carried mark is the only one seen.
 *
 * (Deliberately a per-plugin copy: each plugin installs on its own.)
 */
const fs = require('fs');
const path = require('path');
const { scan } = require('./scan.js');

// How much of the transcript's end is read to find the turn's text.
const TAIL_BYTES = 2 * 1024 * 1024;

// The transcript this actor's text is in: the session's for the main agent,
// the subagent's own beside it. null when there is none to read.
function transcriptOf(data, actor) {
  if (!data) return null;
  if (actor && actor !== 'main') {
    if (typeof data.agent_transcript_path === 'string' && data.agent_transcript_path) return data.agent_transcript_path;
    if (typeof data.transcript_path !== 'string' || !/\.jsonl$/i.test(data.transcript_path)) return null;
    return path.join(data.transcript_path.replace(/\.jsonl$/i, ''), 'subagents', `agent-${actor}.jsonl`);
  }
  return typeof data.transcript_path === 'string' && data.transcript_path ? data.transcript_path : null;
}

function tail(file) {
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const size = fs.fstatSync(fd).size;
      const len = Math.min(size, TAIL_BYTES);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      const raw = buf.toString('utf8');
      return len < size ? raw.slice(raw.indexOf('\n') + 1) : raw;
    } finally { fs.closeSync(fd); }
  } catch (_) { return ''; }
}

// A prompt the owner typed, as the transcript records it: not a tool result,
// not a host-inserted block (those open with `<`), not a meta entry.
function ownerPrompt(o) {
  const c = o.message && o.message.content;
  const owner = typeof c === 'string' ? !/^\s*</.test(c) : Array.isArray(c) && c.some((x) => x && x.type === 'text');
  return owner && !o.isMeta;
}

/*
 * The id of the latest entry, since the owner's last prompt, whose text marks
 * a conjecture; null when there is none, or the transcript cannot be read.
 */
function latestMarked(file) {
  if (!file) return null;
  const lines = tail(file).split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line) continue;
    let o;
    try { o = JSON.parse(line); } catch (_) { continue; }
    if (!o) continue;
    if (o.type === 'user') { if (ownerPrompt(o)) return null; continue; }
    const c = o.type === 'assistant' && o.message && o.message.content;
    if (!Array.isArray(c)) continue;
    const text = c.filter((x) => x && x.type === 'text' && typeof x.text === 'string').map((x) => x.text).join('\n\n');
    // Claude Code gives every entry a uuid; the time and the length stand in
    // for one without, so no text is kept.
    if (text && scan(text).conjectures > 0) return o.uuid || `${o.timestamp || ''}:${line.length}`;
  }
  return null;
}

module.exports = { transcriptOf, latestMarked, TAIL_BYTES };
