'use strict';
/*
 * Which files the turn changed, and which of them nobody reviewed after their
 * last change - in the medium the result is used in.
 *
 * An edit is a write / edit / patch tool that names a file. What reviews it
 * depends on what the file is:
 *   - a document or data (text, markdown, csv, json, pdf, docx...) is read:
 *     a read tool on that path, or a command that names it;
 *   - an image is viewed: a read tool on that path (hosts show it), a command
 *     that names it, or a browser / preview / screenshot tool;
 *   - anything else - code, markup, styles, audio, video - is what it does,
 *     renders or plays: a run (a shell or exec tool) or a render (a browser,
 *     preview or screenshot tool). Reading its source is not reviewing it.
 *
 * A run or a render is not matched to a file: any run reviews every pending
 * code file, any render every pending file. That errs toward silence: a
 * missed finding costs less than a false one. A shell command that writes a
 * file counts as a run, not an edit, for the same reason.
 *
 * The turn starts at the user's message (Claude Code, Codex) or after the
 * last response (Cursor, which has no prompt hook).
 */

// Droid names the tool that writes a new file Create.
const EDIT_TOOL_RE = /edit|write|notebook|patch|replace|create_file|apply_diff|^create$/i;
const NOT_EDIT_RE = /todo|clipboard|memory/i;
const READ_TOOL_RE = /^read$|read_file|readfile|view_file|open_file/i;
const SHELL_TOOL_RE = /bash|shell|terminal|command|exec|powershell/i;
const RENDER_TOOL_RE = /screenshot|preview|navigate|read_page|get_page_text|snapshot|browser|computer/i;

const TEXT_EXT = /\.(md|markdown|mdx|txt|rst|adoc|org|csv|tsv|json|jsonl|ya?ml|toml|ini|xml|docx?|odt|rtf|pdf|ipynb)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|tiff?|ico|avif)$/i;
const LEDGER_RE = /(?:^|\/)\.agent\/progress(?:-[^/]+)?\.md$/;
const MAX_PENDING = 64;
const MAX_SEEN = 500;
const MAX_COUNT = 2000;
// A path a shell command names: a word with a file extension.
const PATH_TOKEN = /[\w.:\-/]+\.[a-z0-9]{1,6}\b/gi;

function filePathOf(input) {
  if (!input || typeof input !== 'object') return null;
  for (const k of ['file_path', 'path', 'notebook_path', 'target_file', 'filePath', 'file']) {
    if (typeof input[k] === 'string' && input[k]) return input[k];
  }
  return null;
}

function commandOf(input) {
  if (!input || typeof input !== 'object') return '';
  const c = input.command || input.cmd || input.script;
  return typeof c === 'string' ? c : '';
}

const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
const same = (a, b) => a === b || a.endsWith('/' + b) || b.endsWith('/' + a);
const base = (p) => p.slice(p.lastIndexOf('/') + 1);

// How a file is reviewed: read, view, or run / render.
function mediumOf(file) {
  if (TEXT_EXT.test(file)) return 'read';
  if (IMAGE_EXT.test(file)) return 'view';
  return 'run';
}

function kindOf(toolName, toolInput) {
  const name = String(toolName || '');
  if (!name) return null;
  if (RENDER_TOOL_RE.test(name)) return 'render';
  if (SHELL_TOOL_RE.test(name)) return 'run';
  if (READ_TOOL_RE.test(name) && filePathOf(toolInput)) return 'read';
  if (EDIT_TOOL_RE.test(name) && !NOT_EDIT_RE.test(name) && filePathOf(toolInput)) return 'edit';
  return null;
}

function freshTurn(st, now) {
  st.edits = 0;
  st.reviews = 0;
  st.toReview = {};
  // When this agent's turn began, and when it last reviewed what: a subagent's
  // edits are weighed against these (delegated below).
  st.turnStart = typeof now === 'number' ? now : Date.now();
  st.reviewedAt = {};
  st.lastRun = 0;
  st.lastRender = 0;
}

function unreviewed(st) {
  return st && st.toReview && typeof st.toReview === 'object' ? Object.keys(st.toReview).length : 0;
}

// Record one tool call into an actor's state (the main agent's or a subagent's,
// lib/state.js); returns its kind (or null). `now` is the call's time.
function observe(st, toolName, toolInput, now) {
  const kind = kindOf(toolName, toolInput);
  if (!kind) return null;
  const at = typeof now === 'number' ? now : Date.now();
  if (!st.toReview || typeof st.toReview !== 'object') st.toReview = {};
  if (!st.reviewedAt || typeof st.reviewedAt !== 'object') st.reviewedAt = {};
  const pending = st.toReview;
  let cleared = 0;
  const clear = (test) => {
    for (const k of Object.keys(pending)) if (test(k, pending[k])) { delete pending[k]; cleared += 1; }
  };
  const reviewed = (k) => { if (k in st.reviewedAt || Object.keys(st.reviewedAt).length < MAX_SEEN) st.reviewedAt[k] = at; };

  if (kind === 'edit') {
    const f = norm(filePathOf(toolInput));
    // The cross-session ledger and its detail files (progress-self-monitoring)
    // are notes about the work, not a result the request asked for.
    if (LEDGER_RE.test(f)) return kind;
    st.edits = (st.edits || 0) + 1;
    clear((k) => same(k, f));
    if (Object.keys(pending).length < MAX_PENDING) pending[f] = mediumOf(f);
    // Every file this actor edited and when, whatever it reviewed after: what
    // a subagent changed is the parent's to review (delegated below).
    if (!st.edited || typeof st.edited !== 'object') st.edited = {};
    if (f in st.edited || Object.keys(st.edited).length < MAX_PENDING) st.edited[f] = { m: mediumOf(f), at };
    return kind;
  }
  if (kind === 'read') {
    const f = norm(filePathOf(toolInput));
    seen(st, f);
    reviewed(f);
    clear((k, m) => m !== 'run' && same(k, f));
  } else if (kind === 'run') {
    const cmd = norm(commandOf(toolInput));
    for (const tok of cmd.match(PATH_TOKEN) || []) { seen(st, tok); reviewed(tok); }
    st.lastRun = at;
    clear((k, m) => m === 'run' || (base(k) && cmd.includes(base(k))));
  } else if (kind === 'render') {
    st.lastRender = at;
    clear(() => true);
  }
  if (cleared) st.reviews = (st.reviews || 0) + 1;
  return kind;
}

// The files the session opened, for the whole session: a read, or a path a
// command names. Their names stay in the state file and reach no message.
function seen(st, f) {
  if (!st.seen || typeof st.seen !== 'object') st.seen = {};
  const k = String(f).replace(/^\/([a-z])\//, '$1:/');
  if (k && Object.keys(st.seen).length < MAX_SEEN) st.seen[k] = 1;
}

// How much of the project the session opened, as two counts: the files it
// read, and the files the project has (dot-folders and node_modules aside,
// counted up to MAX_COUNT). Nothing is opened to count them.
function looked(st, dir) {
  if (!dir) return null;
  const root = norm(require('path').resolve(dir)).replace(/\/$/, '');
  const read = Object.keys((st && st.seen) || {}).filter((k) => !/^([a-z]:)?\//.test(k) || k === root || k.startsWith(root + '/')).length;
  let files = 0;
  const stack = [dir];
  try {
    while (stack.length && files < MAX_COUNT) {
      const d = stack.pop();
      for (const e of require('fs').readdirSync(d, { withFileTypes: true })) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        if (e.isDirectory()) stack.push(require('path').join(d, e.name));
        else if (e.isFile() && ++files >= MAX_COUNT) break;
      }
    }
  } catch (_) { return null; }
  return { read, files, more: files >= MAX_COUNT };
}

/*
 * What the main agent's subagents changed during its turn and it has not
 * reviewed since. A subagent's change is the parent's to ship, so it counts as
 * the parent's edit; a subagent's own read, run or render does not count as
 * the parent's review - only the parent's look after the subagent's last edit
 * of that file does, by the same media as observe(). Files already pending in
 * the parent's own record are not counted twice.
 *
 * parent: the main agent's state; subs: the session's subagent states.
 * Returns { edited, unreviewed }: counts of distinct files.
 */
function delegated(parent, subs) {
  const p = parent || {};
  const since = typeof p.turnStart === 'number' ? p.turnStart : 0;
  const own = Object.keys(p.toReview || {});
  const reviewedAt = p.reviewedAt || {};
  const lookedAfter = (f, m, at) => {
    if ((p.lastRender || 0) > at) return true;
    if (m === 'run' && (p.lastRun || 0) > at) return true;
    if (m === 'run') return Object.keys(reviewedAt).some((k) => reviewedAt[k] > at && base(f) && k.includes(base(f)));
    return Object.keys(reviewedAt).some((k) => reviewedAt[k] > at && same(k, f));
  };
  const edited = new Set();
  const open = new Set();
  for (const s of subs || []) {
    for (const [f, rec] of Object.entries((s && s.edited) || {})) {
      if (!rec || typeof rec.at !== 'number' || rec.at < since) continue;
      edited.add(f);
      if (!own.some((k) => same(k, f)) && !lookedAfter(f, rec.m, rec.at)) open.add(f);
    }
  }
  return { edited: edited.size, unreviewed: open.size };
}

module.exports = { observe, freshTurn, kindOf, mediumOf, unreviewed, looked, delegated };
