'use strict';
/*
 * Plan write-back: does the plan keep up with what is decided on it?
 *
 * Over a long piece of work the owner decides one step at a time - picks an
 * option, approves a change - and the work moves on: code, results, notes.
 * The plan the work is checked against can stop moving with it, and every
 * later [PLAN CHECK] then quotes a plan that no longer says what was decided.
 * Two facts show it without reading a word of the plan:
 *
 *   - the owner's prompts that decide something (an option letter, an
 *     approval), counted since the plan last changed on disk: at the third,
 *     the agent hears that the plan has not moved;
 *   - a [PLAN CHECK] that decided `revise-plan`, the owner's answer since, and
 *     the plan still unchanged.
 *
 * Which file is the plan is the agent's own word: the path its latest
 * [PLAN CHECK] names in `Plan` (hooks/exec-stop.js reads the turn's blocks at
 * the close). Any file, any name - nothing here guesses a plan from a file
 * name. A `Plan` that names no file (the owner's request, a ticket elsewhere)
 * leaves nothing to watch. When no block has named a file, the project's own
 * pointer is used: the `Plan:` line of its progress ledger (ledgerPlans).
 * With neither, nothing is said. Whether the plan changed is
 * its mtime: a write by the agent's file tools, its shell, a subagent or a
 * person all keep it current. Only a plan that is kept is watched: the count
 * starts once the plan has changed during the session, so a plan nobody
 * maintains here - a spec, someone else's ticket - is not nagged about.
 *
 * Nothing here reads a document's text. The prompt is matched on its opening
 * words, the agent's text only for the blocks' Plan and Decision, and none of
 * it is kept. What is said back names no file: the agent knows which plan its
 * own block named, and the line says only that it has not changed.
 */
const fs = require('fs');
const path = require('path');
const { userText } = require('./host.js');

// The third decision since the plan last changed is the one that is said.
const DECISIONS_BEFORE_NOTICE = 3;
const MAX_PLANS = 3;
// How much of the session transcript's end is read to find the turn's blocks.
const TAIL_BYTES = 2 * 1024 * 1024;

/*
 * A prompt that decides: it opens on the choice. An option letter on its own
 * or followed by a colon, a comma or the go-ahead; "go ahead with B"; an
 * approval. Anchored at the start, so a question that mentions an option
 * later on is not one.
 */
const LETTER = String.raw`(?:(?:opci[oó]n|option)\s+)?[A-D]`;
const DECISION_RE = new RegExp(
  String.raw`^\s*(?:` +
    LETTER + String.raw`(?:\s*[:.,)]|\s*$|\s+(?:adelante|dale|y\b|pero\b|and\b|but\b|then\b|please\b))` +
    String.raw`|(?:adelante|ve|vamos|sigue|go|go ahead|proceed)\s+(?:con\s+|with\s+)?(?:la\s+|the\s+)?` + LETTER + String.raw`\b` +
    String.raw`|s[ií][:,]?\s+(?:adelante|implementa|redact|hazlo|dale)` +
    String.raw`|yes[:,]?\s+(?:go ahead|do it|implement|proceed)` +
    String.raw`|(?:apruebo|aprobado|acepto|approved?\b|i approve|accepted|mi decisi[oó]n|my decision|decid[ií]\b|i decided?\b)` +
  String.raw`)`, 'i');

function isDecision(prompt) {
  return DECISION_RE.test(userText(prompt).trim());
}

function mtimeOf(p) {
  try { const s = fs.statSync(p); return s.isFile() ? s.mtimeMs : null; } catch (_) { return null; }
}

const norm = (p) => String(p).split(path.sep).join('/').replace(/\\/g, '/').toLowerCase();

/*
 * The files a `Plan` field names: backticked paths, link targets, bare paths
 * with an extension. The quoted objective after the name is not a path, and
 * neither is a URL. Each is resolved against the project, then against the
 * documents the agent read (a path written relative to another folder), and
 * kept only if it is a file on disk.
 */
function planPaths(field, cwd, known) {
  if (typeof field !== 'string' || !field) return [];
  const head = field.replace(/\s[-–—]\s*["“].*$/, '');
  const tokens = [];
  for (const m of head.matchAll(/`([^`]+)`|\]\(([^)\s]+)\)|((?:[\w.~-]+[\\/])*[\w.~-]+\.[A-Za-z0-9]{1,8})(?![\w\\/])/g)) {
    const t = (m[1] || m[2] || m[3] || '').trim().replace(/[),.;:]+$/, '');
    if (!t || /\s/.test(t) || /^[a-z]+:\/\//i.test(t) || !/\.[A-Za-z0-9]{1,8}$/.test(t)) continue;
    tokens.push(t);
  }
  const out = [];
  for (const t of tokens) {
    let p = path.isAbsolute(t) ? t : (cwd ? path.join(cwd, t) : null);
    if (!p || mtimeOf(p) === null) {
      const tail = '/' + norm(t).replace(/^\.?\//, '');
      p = (known || []).find((k) => norm(k).endsWith(tail)) || null;
    }
    if (p && mtimeOf(p) !== null && !out.includes(p)) out.push(p);
    if (out.length >= MAX_PLANS) break;
  }
  return out;
}

/*
 * The agent's text in the turn that just closed, from the end of the session
 * transcript: assistant text since the owner's last prompt. A block written at
 * the start of a turn is not in its final message, so the final message alone
 * would miss most of them. '' when the transcript cannot be read.
 */
function turnText(transcriptPath) {
  if (typeof transcriptPath !== 'string' || !transcriptPath) return '';
  let raw = '';
  try {
    const fd = fs.openSync(transcriptPath, 'r');
    try {
      const size = fs.fstatSync(fd).size;
      const len = Math.min(size, TAIL_BYTES);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      raw = buf.toString('utf8');
      if (len < size) raw = raw.slice(raw.indexOf('\n') + 1);
    } finally { fs.closeSync(fd); }
  } catch (_) { return ''; }
  const lines = raw.split('\n');
  const texts = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    let o;
    try { o = JSON.parse(lines[i]); } catch (_) { continue; }
    const c = o && o.message && o.message.content;
    if (o.type === 'user') {
      const owner = typeof c === 'string' ? !/^\s*</.test(c) : Array.isArray(c) && c.some((x) => x && x.type === 'text');
      if (owner && !o.isMeta) break;
      continue;
    }
    if (o.type === 'assistant' && Array.isArray(c)) {
      for (let j = c.length - 1; j >= 0; j--) if (c[j] && c[j].type === 'text' && c[j].text) texts.push(c[j].text);
    }
  }
  return texts.reverse().join('\n\n');
}

/*
 * The plan the project's ledger points at: the `Plan:` line of
 * `.agent/progress.md`, which progress-self-monitoring keeps for exactly
 * this - "the artifact executive-self-monitoring anchors to". Only that line
 * is read, and only the paths in it are used. [] when there is none.
 */
function ledgerPlans(cwd, known) {
  if (!cwd) return [];
  let text = '';
  try { text = fs.readFileSync(path.join(cwd, '.agent', 'progress.md'), 'utf8'); } catch (_) { return []; }
  const m = text.match(/^[ \t]*(?:[-*][ \t]+)?\**Plan\**[ \t]*:\**[ \t]*(.+)$/im);
  return m ? planPaths(m[1], cwd, known) : [];
}

function state(st) {
  return st.wb || (st.wb = { plans: [], base: {}, living: false, count: 0, planMtime: null, revision: null });
}


function latestOf(plans) {
  let latest = null;
  for (const p of plans) { const m = mtimeOf(p); if (m !== null && (latest === null || m > latest)) latest = m; }
  return latest;
}

/*
 * At the close of a turn: the plan the latest block names becomes the plan
 * watched (a block that names no file stops the watch), and a block that
 * decided revise-plan records the plan as it stands now. Returns true when the
 * record changed.
 *   res  lib/plan.js scan() of the turn's text
 */
function onClose(st, res, cwd) {
  if (!res || !res.blocks) return false;
  const wb = state(st);
  const declared = planPaths(res.plans[res.plans.length - 1], cwd, Object.keys(st.files || {}));
  if (declared.join('\n') !== wb.plans.join('\n')) {
    wb.plans = declared;
    wb.count = 0;
    wb.planMtime = null;
    wb.living = false;
    wb.base = {};
    wb.revision = null;
  }
  if (res.revise && wb.plans.length) wb.revision = { planMtime: latestOf(wb.plans), answered: false };
  return true;
}

/*
 * On each owner prompt: settle whether the plan changed since the last
 * prompt, then count this prompt if it decides. Returns the line to say, or ''.
 */
function onPrompt(st, prompt, cwd) {
  const wb = state(st);
  // The agent's own word first; the ledger's pointer when no block named a file.
  const declared = wb.plans.length ? wb.plans : ledgerPlans(cwd, Object.keys(st.files || {}));
  const plans = declared.filter((p) => mtimeOf(p) !== null);
  if (!plans.length) return '';
  let latest = null;
  for (const p of plans) {
    const m = mtimeOf(p);
    if (wb.base[p] == null) wb.base[p] = m;
    if (m > wb.base[p]) wb.living = true;
    if (latest === null || m > latest) latest = m;
  }
  const moved = wb.planMtime !== null && latest > wb.planMtime;
  if (wb.planMtime === null || moved) wb.planMtime = latest;
  if (moved) { wb.count = 0; wb.revision = null; }
  const out = [];
  if (wb.revision) {
    if (wb.revision.answered && latest <= wb.revision.planMtime) {
      out.push('[executive self-monitoring] Your [PLAN CHECK] decided revise-plan, the owner has answered since, ' +
        'and the plan it names has not changed. Write the revision into the plan now, or say what it still waits for.');
      wb.revision = null;
    } else {
      wb.revision.answered = true;
    }
  }
  if (wb.living && isDecision(prompt)) {
    wb.count += 1;
    if (wb.count >= DECISIONS_BEFORE_NOTICE && !out.length) {
      out.push('[executive self-monitoring] This is the third decision in a row since the plan you work ' +
        'from last changed, and the work has gone on. If a step closed, a decision changed the plan or a ' +
        'gate passed or failed, write it where the plan keeps it now; if the plan already says what was decided, say so and go on.');
      wb.count = 0;
    }
  }
  return out.join('\n');
}

module.exports = { onPrompt, onClose, turnText, planPaths, isDecision, DECISION_RE, DECISIONS_BEFORE_NOTICE };
