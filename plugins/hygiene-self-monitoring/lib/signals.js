'use strict';
/*
 * What the session's edits reached: per code file, the public functions whose
 * code changed since the session first saw the file (lib/reach.js).
 *
 * The first sight of a file is its baseline: the bounded snapshot taken when
 * the session starts, a read of the file, or - for an edit tool that carries
 * the text it replaced - the file with that edit undone. After each edit the
 * file is read again and compared with its baseline. A file the session never
 * saw before it was edited has no baseline and is not counted: a new file
 * changes no behaviour a caller relied on.
 *
 * Reads the tool's name, the path it names and, for an edit, the replaced and
 * replacing text; the file is read from disk. None of it is emitted: what
 * leaves is a path, line numbers and counts.
 */

const fs = require('fs');
const path = require('path');
const reach = require('./reach.js');

const EDIT_TOOL_RE = /edit|write|notebook|patch|replace|create_file|apply_diff/i;
const NOT_EDIT_RE = /todo|clipboard|memory/i;
const READ_TOOL_RE = /^read$|read_file|readfile|view_file|open_file/i;

const MAX_FILES = 48;
const SNAPSHOT_FILES = 200;
const SNAPSHOT_DEPTH = 5;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', 'vendor', '.next', '.cache', 'tmp']);
const MAX_NUDGES = 3;

function filePathOf(input) {
  if (!input || typeof input !== 'object') return null;
  for (const k of ['file_path', 'path', 'notebook_path', 'target_file', 'filePath', 'file']) {
    if (typeof input[k] === 'string' && input[k]) return input[k];
  }
  return null;
}

function kindOf(toolName, toolInput) {
  const name = String(toolName || '');
  if (!name || !filePathOf(toolInput)) return null;
  if (READ_TOOL_RE.test(name)) return 'read';
  if (EDIT_TOOL_RE.test(name) && !NOT_EDIT_RE.test(name)) return 'edit';
  return null;
}

const keyOf = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();

function absOf(cwd, file) {
  if (path.isAbsolute(file)) return file;
  return cwd ? path.join(cwd, file) : null;
}

function relOf(cwd, abs) {
  if (!cwd) return abs;
  const r = path.relative(cwd, abs);
  return r && !r.startsWith('..') && !path.isAbsolute(r) ? r.replace(/\\/g, '/') : abs.replace(/\\/g, '/');
}

function readText(abs) {
  try {
    const st = fs.statSync(abs);
    if (!st.isFile() || st.size > reach.MAX_BYTES) return null;
    return fs.readFileSync(abs, 'utf8');
  } catch (_) { return null; }
}

function files(st) {
  if (!st.files || typeof st.files !== 'object') st.files = {};
  return st.files;
}

function remember(st, cwd, abs, text) {
  const f = files(st);
  const k = keyOf(relOf(cwd, abs));
  if (f[k] || Object.keys(f).length >= MAX_FILES) return;
  const s = reach.surface(text);
  if (!s || s.exported.size === 0) return;
  f[k] = { rel: relOf(cwd, abs), base: reach.pack(s), reached: [] };
}

// The file as it was before an edit that names the text it replaced.
function undo(text, input) {
  if (typeof text !== 'string' || !input) return null;
  const edits = Array.isArray(input.edits) ? input.edits.slice().reverse() : [input];
  let out = text;
  for (const e of edits) {
    const o = e && (e.old_string !== undefined ? e.old_string : e.old_str);
    const n = e && (e.new_string !== undefined ? e.new_string : e.new_str);
    if (typeof o !== 'string' || typeof n !== 'string') return null;
    if (e.replace_all) { if (!n) return null; out = out.split(n).join(o); continue; }
    const at = out.indexOf(n);
    if (at === -1 || (n && out.indexOf(n, at + 1) !== -1)) return null;
    out = out.slice(0, at) + o + out.slice(at + n.length);
  }
  return out;
}

/*
 * The bounded snapshot at session start: the public surface of the code files
 * near the project root, so an edit made without a read still has a
 * baseline.
 */
function snapshot(st, cwd) {
  if (!cwd) return 0;
  let seen = 0;
  const walk = (dir, depth) => {
    if (depth > SNAPSHOT_DEPTH || seen >= SNAPSHOT_FILES) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      if (seen >= SNAPSHOT_FILES) return;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(p, depth + 1);
      } else if (e.isFile() && reach.isCode(e.name)) {
        seen += 1;
        const text = readText(p);
        if (text !== null) remember(st, cwd, p, text);
      }
    }
  };
  walk(cwd, 0);
  return Object.keys(files(st)).length;
}

/*
 * Record one tool call. Returns { kind, file, grew } - grew is true when this
 * edit added a public function to what the session reached.
 */
function observe(st, cwd, toolName, toolInput) {
  const kind = kindOf(toolName, toolInput);
  if (!kind) return { kind: null };
  const file = filePathOf(toolInput);
  if (!reach.isCode(file)) return { kind, file: null };
  const abs = absOf(cwd, file);
  if (!abs) return { kind, file: null };
  const text = readText(abs);
  if (text === null) return { kind, file: null };
  if (kind === 'read') { remember(st, cwd, abs, text); return { kind, file: relOf(cwd, abs) }; }

  const f = files(st);
  const k = keyOf(relOf(cwd, abs));
  if (!f[k]) {
    const before = undo(text, toolInput);
    if (before !== null) remember(st, cwd, abs, before);
  }
  const entry = f[k];
  if (!entry) return { kind, file: relOf(cwd, abs) };
  const groups = reach.reached(reach.unpack(entry.base), reach.surface(text));
  const before = entry.reached.length;
  entry.reached = groups.map((g) => ({ names: g.names.slice(0, 8), line: g.line, how: g.how }));
  return { kind, file: entry.rel, grew: entry.reached.length > before };
}

// Every public function the session's edits reached, file by file.
function reachedAll(st) {
  const out = [];
  for (const e of Object.values(files(st))) for (const g of e.reached || []) out.push(Object.assign({ file: e.rel }, g));
  return out;
}

// The edit nudge: due when the session has reached two or more public
// functions and that set just grew, at most MAX_NUDGES times a session.
function nudgeDue(st, grew) {
  const n = reachedAll(st).length;
  if (!grew || n < 2 || (st.nudges || 0) >= MAX_NUDGES || n <= (st.nudgedAt || 0)) return 0;
  st.nudges = (st.nudges || 0) + 1;
  st.nudgedAt = n;
  return n;
}

module.exports = { observe, snapshot, reachedAll, nudgeDue, kindOf, undo, MAX_NUDGES };
