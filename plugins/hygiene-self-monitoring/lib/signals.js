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

// Droid names the tool that writes a new file Create.
const EDIT_TOOL_RE = /edit|write|notebook|patch|replace|create_file|apply_diff|^create$/i;
const NOT_EDIT_RE = /todo|clipboard|memory/i;
const READ_TOOL_RE = /^read$|read_file|readfile|view_file|open_file/i;

/*
 * The record is bounded so each hook's read and rewrite of the state stays
 * small, at any project size: at most MAX_FILES files and RECORD_BYTES of
 * stored surfaces. A file the session reads or edits always gets a slot: when
 * the record is full, the least recently used file whose edits reached nothing
 * gives up its own - a snapshot file the session never touched first. A file
 * whose edits reached a public function is never given up: the close is read
 * against it. Only when every slot holds such a file is a new one left out,
 * and counted (`dropped`).
 */
const MAX_FILES = 200;
const RECORD_BYTES = 256 * 1024;
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

const sizeOf = (base) => { try { return JSON.stringify(base).length; } catch (_) { return RECORD_BYTES; } };
const bytesOf = (f) => Object.values(f).reduce((n, e) => n + (e.sz || sizeOf(e.base)), 0);
const tick = (st) => { st.tick = (st.tick || 0) + 1; return st.tick; };
const reachedSomething = (e) => Array.isArray(e.reached) && e.reached.length > 0;

// Free room for `need` bytes: false when only files that reached something are left.
function makeRoom(f, need) {
  let bytes = bytesOf(f);
  while (Object.keys(f).length >= MAX_FILES || bytes + need > RECORD_BYTES) {
    let victim = null;
    for (const [k, e] of Object.entries(f)) {
      if (reachedSomething(e)) continue;
      const rank = [e.src === 'snap' ? 0 : 1, e.at || 0];
      if (!victim || rank[0] < victim.rank[0] || (rank[0] === victim.rank[0] && rank[1] < victim.rank[1])) victim = { k, rank };
    }
    if (!victim) return false;
    bytes -= f[victim.k].sz || sizeOf(f[victim.k].base);
    delete f[victim.k];
  }
  return true;
}

// A new entry. The snapshot fills free room only; a file the session touches makes room.
function add(st, f, k, rel, base, src) {
  const sz = sizeOf(base);
  if (sz > RECORD_BYTES) return false;
  const room = src === 'snap'
    ? Object.keys(f).length < MAX_FILES && bytesOf(f) + sz <= RECORD_BYTES
    : makeRoom(f, sz);
  if (!room) {
    if (src !== 'snap') st.dropped = (st.dropped || 0) + 1;
    return false;
  }
  f[k] = { rel, base, reached: [], sz, src, at: tick(st) };
  return true;
}

// The session touched this file: it is the most recently used, and no longer a snapshot-only entry.
function touch(st, entry) {
  entry.at = tick(st);
  entry.src = 'seen';
}

function remember(st, cwd, abs, text, src) {
  const f = files(st);
  const k = keyOf(relOf(cwd, abs));
  if (f[k]) { if (src !== 'snap') touch(st, f[k]); return; }
  const s = reach.surface(text);
  if (!s || s.exported.size === 0) return;
  add(st, f, k, relOf(cwd, abs), reach.pack(s), src || 'seen');
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
        if (text !== null) remember(st, cwd, p, text, 'snap');
      }
    }
  };
  walk(cwd, 0);
  return Object.keys(files(st)).length;
}

/*
 * Record one tool call. Returns { kind, file, grew } - grew is true when this
 * edit added a public function to what the session reached.
 *
 * `baseOf(key)`, when given, is the session's baseline for a file this record
 * has none for: a subagent keeps its own record (lib/state.js per actor) but
 * edits the session's files, so its reach is measured against the snapshot
 * the main agent took when the session started.
 */
/*
 * `turn`: the main agent's turn number (its prompt count). A subagent's
 * record is stamped with the main agent's turn, so the main agent's stop can
 * tell whether anything was edited in this turn by any actor.
 */
function observe(st, cwd, toolName, toolInput, baseOf, turn) {
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
  if (!f[k] && typeof baseOf === 'function') {
    const b = baseOf(k);
    if (b) add(st, f, k, relOf(cwd, abs), b, 'seen');
  }
  if (!f[k]) {
    const before = undo(text, toolInput);
    if (before !== null) remember(st, cwd, abs, before, 'seen');
  }
  const entry = f[k];
  if (!entry) return { kind, file: relOf(cwd, abs) };
  touch(st, entry);
  // When the file was last edited, and in which turn: a function a close
  // settled stays settled until its file is edited again (hooks/hyg-stop.js).
  entry.editedAt = Date.now();
  st.lastEditTurn = typeof turn === 'number' ? turn : (st.turns || 0);
  const groups = reach.reached(reach.unpack(entry.base), reach.surface(text));
  const before = entry.reached.length;
  entry.reached = groups.map((g) => ({ names: g.names.slice(0, 8), line: g.line, how: g.how }));
  return { kind, file: entry.rel, grew: entry.reached.length > before };
}

// Every public function the session's edits reached, file by file.
function reachedAll(st) {
  const out = [];
  for (const e of Object.values(files(st))) for (const g of e.reached || []) out.push(Object.assign({ file: e.rel, at: e.editedAt || 0 }, g));
  return out;
}

/*
 * The main agent's reach plus its subagents': every public function any actor
 * of the session changed, once, a subagent's marked `by: 'subagent'` - the
 * main agent ships them all, so its close accounts for them all.
 */
function reachedWith(main, subs) {
  const out = reachedAll(main || {});
  const key = (g) => `${g.file}|${g.line}|${(g.names || []).join(',')}`;
  const seenKeys = new Set(out.map(key));
  for (const s of subs || []) {
    for (const g of reachedAll(s || {})) {
      if (seenKeys.has(key(g))) continue;
      seenKeys.add(key(g));
      out.push(Object.assign({ by: 'subagent' }, g));
    }
  }
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

module.exports = { observe, snapshot, reachedAll, reachedWith, nudgeDue, kindOf, undo, MAX_NUDGES, MAX_FILES, RECORD_BYTES };
