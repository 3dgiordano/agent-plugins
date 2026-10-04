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

const EDIT_TOOL_RE = /edit|write|notebook|patch|replace|create_file|apply_diff/i;
const NOT_EDIT_RE = /todo|clipboard|memory/i;
const READ_TOOL_RE = /^read$|read_file|readfile|view_file|open_file/i;
const SHELL_TOOL_RE = /bash|shell|terminal|command|exec|powershell/i;
const RENDER_TOOL_RE = /screenshot|preview|navigate|read_page|get_page_text|snapshot|browser|computer/i;

const TEXT_EXT = /\.(md|markdown|mdx|txt|rst|adoc|org|csv|tsv|json|jsonl|ya?ml|toml|ini|xml|docx?|odt|rtf|pdf|ipynb)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|tiff?|ico|avif)$/i;
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

function freshTurn(st) {
  st.edits = 0;
  st.reviews = 0;
  st.toReview = {};
}

function unreviewed(st) {
  return st && st.toReview && typeof st.toReview === 'object' ? Object.keys(st.toReview).length : 0;
}

// Record one tool call into the session state; returns its kind (or null).
function observe(st, toolName, toolInput) {
  const kind = kindOf(toolName, toolInput);
  if (!kind) return null;
  if (!st.toReview || typeof st.toReview !== 'object') st.toReview = {};
  const pending = st.toReview;
  let cleared = 0;
  const clear = (test) => {
    for (const k of Object.keys(pending)) if (test(k, pending[k])) { delete pending[k]; cleared += 1; }
  };

  if (kind === 'edit') {
    const f = norm(filePathOf(toolInput));
    st.edits = (st.edits || 0) + 1;
    clear((k) => same(k, f));
    if (Object.keys(pending).length < MAX_PENDING) pending[f] = mediumOf(f);
    return kind;
  }
  if (kind === 'read') {
    const f = norm(filePathOf(toolInput));
    seen(st, f);
    clear((k, m) => m !== 'run' && same(k, f));
  } else if (kind === 'run') {
    const cmd = norm(commandOf(toolInput));
    for (const tok of cmd.match(PATH_TOKEN) || []) seen(st, tok);
    clear((k, m) => m === 'run' || (base(k) && cmd.includes(base(k))));
  } else if (kind === 'render') {
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

module.exports = { observe, freshTurn, kindOf, mediumOf, unreviewed, looked };
