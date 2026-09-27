'use strict';
/*
 * The documents the agent read in this session, and whether one changed on
 * disk since its last Read, Write or Edit of it.
 *
 * The plan is an artifact on disk, and the failure this plugin exists for is
 * quoting it from memory after it changed. What the agent lacks then is the
 * fact: the file changed. This keeps it - the path and the mtime of each
 * document read, moved on when the agent writes it through a file tool - and
 * hands it back as one line on the next prompt. The file's text is never read
 * here.
 *
 * A change made through the shell - the agent's own `sed -i` included - is not
 * a file tool's, so it is reported: the message says only that the file
 * changed since the agent last read or wrote it, which is then true.
 *
 * Documents only (.md, .markdown, .txt, .rst, .adoc): a plan, a spec, an ADR,
 * a ticket. Code changes under the agent all the time, by its own hand.
 *
 * One JSON file per session beside the cadence counter,
 * <temp>/3dgiordano-agent-plugins/execmon_<host>_<session>.reads.json, swept
 * with it after a week (exec-session-end.js).
 *
 * Parallel tool calls run their PostToolUse hooks at the same time, so every
 * read-modify-write holds a lockfile: without it one hook's save can
 * overwrite another's, and a lost Write record would bring the agent's own
 * edit back on the next prompt as a change on disk.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const DOC_RE = /\.(?:md|markdown|txt|rst|adoc)$/i;
const MAX_FILES = 50;
const READ_TOOL_RE = /^(?:Read|read_file|view)$/;
const WRITE_TOOL_RE = /^(?:Write|Edit|MultiEdit|NotebookEdit|edit_file|write|apply_patch)$/;

// The lock: `wx` create, a real sleep between tries, a bounded wait, and a
// stale-lock breaker for a process that died holding it. If it cannot be had
// in time the update goes ahead without it - the hook must never stall the host.
const LOCK_WAIT_MS = 1500;
const LOCK_STEP_MS = 2;
const LOCK_STALE_MS = 1000;

function file(host, sid) {
  const safe = String(sid || 'nosession').replace(/[^0-9A-Za-z_-]/g, '_');
  return path.join(os.tmpdir(), '3dgiordano-agent-plugins', `execmon_${host}_${safe}.reads.json`);
}

function load(host, sid) {
  try { const j = JSON.parse(fs.readFileSync(file(host, sid), 'utf8')); return j && typeof j.files === 'object' ? j : { files: {} }; } catch (_) { return { files: {} }; }
}

// Temp file + rename, so a reader never sees a torn file; in place if the
// rename fails (Windows, a scanner holding the target open).
function save(host, sid, st) {
  const f = file(host, sid);
  const names = Object.keys(st.files);
  // bounded: the oldest reads go first
  if (names.length > MAX_FILES) for (const n of names.sort((a, b) => st.files[a].seenAt - st.files[b].seenAt).slice(0, names.length - MAX_FILES)) delete st.files[n];
  const json = JSON.stringify(st);
  const tmp = `${f}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, json);
    fs.renameSync(tmp, f);
  } catch (_) {
    try { fs.unlinkSync(tmp); } catch (_2) {}
    try { fs.writeFileSync(f, json); } catch (_3) { /* a lost record, not a lost turn */ }
  }
}

function sleep(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch (_) {}
}

function acquire(lock) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try { fs.closeSync(fs.openSync(lock, 'wx')); return true; } catch (_) {}
    try { if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) fs.unlinkSync(lock); } catch (_) {}
    if (Date.now() >= deadline) return false;
    sleep(LOCK_STEP_MS);
  }
}

// Read, let `fn` change the record (true: save it), under the lock when it can be had.
function update(host, sid, fn) {
  const f = file(host, sid);
  try { fs.mkdirSync(path.dirname(f), { recursive: true }); } catch (_) {}
  const lock = f + '.lock';
  const locked = acquire(lock);
  try {
    const st = load(host, sid);
    const out = fn(st);
    if (out) save(host, sid, st);
    return out;
  } finally {
    if (locked) { try { fs.unlinkSync(lock); } catch (_) {} }
  }
}

function mtimeOf(p) {
  try { return fs.statSync(p).mtimeMs; } catch (_) { return null; }
}

function pathOf(input, cwd) {
  const p = input && (input.file_path || input.target_file || input.path || input.notebook_path);
  if (typeof p !== 'string' || !p) return null;
  return path.isAbsolute(p) ? p : (cwd ? path.join(cwd, p) : null);
}

/*
 * A tool call: a read of a document records its mtime; the agent's own write
 * to one records the new mtime, so its own edit is never news.
 */
function observe(host, sid, toolName, toolInput, cwd) {
  const name = String(toolName || '');
  const read = READ_TOOL_RE.test(name);
  if (!read && !WRITE_TOOL_RE.test(name)) return;
  const p = pathOf(toolInput, cwd);
  if (!p || !DOC_RE.test(p)) return;
  update(host, sid, (st) => {
    if (!read && !st.files[p]) return false; // a document it never read: nothing to compare later
    const m = mtimeOf(p);
    if (m === null) return false;
    st.files[p] = { mtimeMs: m, seenAt: Date.now() };
    return true;
  });
}

/*
 * The documents read earlier that changed on disk since, each reported once:
 * the record moves to the new mtime, so the same change is not said twice.
 */
function changed(host, sid) {
  const out = [];
  update(host, sid, (st) => {
    for (const [p, rec] of Object.entries(st.files)) {
      const m = mtimeOf(p);
      if (m === null || m <= rec.mtimeMs) continue;
      out.push(p);
      st.files[p] = { mtimeMs: m, seenAt: rec.seenAt };
    }
    return out.length > 0;
  });
  return out;
}

module.exports = { observe, changed, file, DOC_RE };
