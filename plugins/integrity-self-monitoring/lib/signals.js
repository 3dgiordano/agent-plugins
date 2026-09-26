'use strict';
/*
 * Integrity signals: what one tool call brought in that makes a result look
 * done when it is not.
 *
 *   code      an edit to a product file introduced one of the shapes in
 *             lib/code.js - read on the file as it is on disk after the
 *             edit, net of what the file already had
 *   command   a shell command that changes the machine or starts a server
 *             (lib/commands.js)
 *   outside   a read, a search or a command that names a path outside the
 *             project - logged only
 *
 * Every signal is said once per session: the same shape in the same file,
 * the same kind of command. The session keeps what it raised (`raised`) so a
 * close can answer it (`disputes`).
 *
 * Fails quiet: an unreadable file, an unknown payload, a path outside the
 * project - no signal.
 */

const fs = require('fs');
const path = require('path');
const code = require('./code.js');
const commands = require('./commands.js');

const EDIT_TOOL_RE = /edit|write|notebook|patch|replace|create_file|apply_diff|search_replace/i;
const SHELL_TOOL_RE = /^(?:bash|shell|powershell|run_terminal_cmd|run_command|terminal|exec_command|local_shell)$|shell|terminal/i;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_RAISED = 32;
const MAX_SEEN = 256;

function filePathOf(input) {
  if (!input || typeof input !== 'object') return null;
  for (const k of ['file_path', 'path', 'target_file', 'notebook_path', 'filePath', 'file']) {
    if (typeof input[k] === 'string' && input[k]) return input[k];
  }
  return null;
}

// The file before the edit, when the host sent it (Claude Code, Codex).
function before(response) {
  const r = response && typeof response === 'object' ? response : null;
  if (!r) return undefined;
  if (r.type === 'create') return '';
  for (const k of ['originalFile', 'originalFileContents', 'original_file']) {
    if (typeof r[k] === 'string') return r[k];
  }
  return undefined;
}

// The lines the edit wrote: a diff's '+' lines when the host sent one,
// else the text fields of the call.
function writtenLines(input, response) {
  const out = [];
  const r = response && typeof response === 'object' ? response : null;
  const fromDiff = (text) => {
    for (const l of String(text).split(/\r?\n/)) if (l[0] === '+' && !l.startsWith('+++')) out.push(l.slice(1));
  };
  if (r && Array.isArray(r.structuredPatch)) {
    for (const h of r.structuredPatch) if (h && Array.isArray(h.lines)) for (const l of h.lines) if (typeof l === 'string' && l[0] === '+') out.push(l.slice(1));
  }
  const diff = r && (r.diffString || r.diff || (r.success && r.success.diffString));
  if (typeof diff === 'string') fromDiff(diff);
  if (typeof response === 'string' && /^@@ /m.test(response)) fromDiff(response);
  if (out.length) return out;
  if (!input || typeof input !== 'object') return out;
  const texts = [];
  for (const k of ['new_string', 'new_str', 'code_edit', 'content', 'contents', 'streamContent', 'new_source', 'new_content', 'replacement']) {
    if (typeof input[k] === 'string') texts.push(input[k]);
  }
  if (Array.isArray(input.edits)) for (const e of input.edits) if (e && typeof (e.new_string || e.new_str) === 'string') texts.push(e.new_string || e.new_str);
  for (const t of texts) out.push(...t.split(/\r?\n/));
  return out;
}

function readFile(abs) {
  try {
    const st = fs.statSync(abs);
    if (!st.isFile() || st.size > MAX_FILE_BYTES) return null;
    return fs.readFileSync(abs, 'utf8');
  } catch (_) { return null; }
}

function relTo(cwd, file) {
  if (!cwd) return file;
  const abs = path.resolve(cwd, file);
  const rel = path.relative(cwd, abs);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel.replace(/\\/g, '/') : file.replace(/\\/g, '/');
}

// The shapes one edit brought into one product file. `read` is how the file
// is read after the edit: the disk, or - replaying a recorded run - the
// content the record carries.
function codeSignals(toolInput, toolResponse, cwd, read) {
  const file = filePathOf(toolInput);
  if (!file) return [];
  const rel = relTo(cwd, file);
  if (!code.isProduct(rel)) return [];
  const abs = path.isAbsolute(file) ? file : (cwd ? path.resolve(cwd, file) : null);
  if (!abs) return [];
  const post = (read || readFile)(abs);
  if (post === null) return [];
  // `at` (the matched text) keys the finding and goes to the opt-in log; it
  // never reaches a message - see lib/messages.js.
  return code.introduced(post, before(toolResponse), writtenLines(toolInput, toolResponse))
    .map((f) => Object.assign({ kind: f.kind, file: rel, line: f.lines[0], at: f.at, measured: f.measured }, f.count ? { count: f.count } : {}));
}

function freshSession() {
  return { seen: {}, raised: [], disputed: [] };
}

const keyOf = (s) => `${s.file || ''}|${s.kind}|${String(s.at || '').replace(/\s+/g, '')}`;

/*
 * Record one tool call.
 * Returns { said: [...], logged: [...], outside: [...] }:
 *   said     measured signals new this session - they go to the agent
 *   logged   unmeasured shapes - they go to the log only
 *   outside  paths outside the project - log only
 */
function observe(st, toolName, toolInput, toolResponse, cwd, own, read) {
  if (!st.seen) Object.assign(st, freshSession());
  const name = String(toolName || '');
  let found = [];
  if (EDIT_TOOL_RE.test(name)) found = codeSignals(toolInput, toolResponse, cwd, read);
  else if (SHELL_TOOL_RE.test(name) && toolInput && typeof toolInput.command === 'string') {
    found = commands.marks(toolInput.command).map((m) => ({ kind: m.kind, what: m.what, measured: true }));
  }
  const out = EDIT_TOOL_RE.test(name) ? [] : commands.outside(toolInput, cwd, own);

  const said = [];
  const logged = [];
  for (const s of found) {
    // a command mark is said once per kind; a code shape once per file and text
    const k = s.file ? keyOf(s) : `|${s.kind}|`;
    if (st.seen[k]) continue;
    if (Object.keys(st.seen).length < MAX_SEEN) st.seen[k] = 1;
    if (s.measured && !(st.disputed || []).includes(k)) said.push(s);
    else logged.push(s);
  }
  if (said.length) st.raised = (st.raised || []).concat(said.map((s) => Object.assign({ key: s.file ? keyOf(s) : `|${s.kind}|` }, s))).slice(-MAX_RAISED);
  return { said, logged, outside: out };
}

// --- the close ------------------------------------------------------------

/*
 * A dispute: the agent answers a raised signal as what the user asked for.
 *   - src/rates.js: misread - the ticket asks for the offline table
 * The subject is the file (or the command's kind); the reason is required.
 * Only a signal raised this session can be answered - a line for anything
 * else is ignored, so a close cannot silence a shape in advance.
 */
const MISREAD_LINE = /^[ \t]*(?:[-*•][ \t]+)?(?:\*\*)?`?([^`\n:]+?)`?(?:\*\*)?[ \t]*:[ \t]*(?:\*\*)?misread(?:\*\*)?[ \t]*(?:[-–—:][ \t]*)(.+)$/gim;

function disputes(text, raised) {
  const out = [];
  if (typeof text !== 'string' || !Array.isArray(raised) || !raised.length) return out;
  for (const m of text.matchAll(MISREAD_LINE)) {
    const subject = m[1].trim().replace(/\\/g, '/');
    const reason = m[2].trim();
    if (reason.length < 3) continue;
    const hits = raised.filter((r) => (r.file && (r.file === subject || r.file.endsWith('/' + subject) || subject.endsWith('/' + r.file))) || (!r.file && r.kind === subject.toLowerCase()));
    for (const h of hits) if (!out.some((o) => o.key === h.key)) out.push({ key: h.key, kind: h.kind, file: h.file || null, at: h.at || h.what || '', reason: reason.slice(0, 200) });
  }
  return out;
}

/*
 * The [INTEGRITY CHECK] block of a close: its four fields, as written.
 * Decorations an agent adds to markdown (`**Result:**`, `## [INTEGRITY
 * CHECK]`) read as the same block.
 */
const FIELDS = { result: /^result$/i, route: /^route$/i, outside: /^outside the task$/i, told: /^told the user$/i };

function block(text) {
  if (typeof text !== 'string') return null;
  const m = text.match(/^[ \t>#*]*\[INTEGRITY CHECK\][ \t*:]*$/m);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length).split(/\r?\n/);
  const out = { result: null, route: null, outside: null, told: null };
  let started = false;
  for (const line of rest) {
    if (!line.trim()) { if (started) break; continue; }
    // `- Result:`, `- **Result:**`, `- **Result**:`, `- __Result__:`, `- *Result*:`
    const f = line.match(/^[ \t]*[-*•][ \t]+(?:\*\*|__|\*|_)?([A-Za-z ]+?)(?:\*\*|__|\*|_)?[ \t]*:(?:\*\*|__|\*|_)?[ \t]*(.*)$/);
    if (!f) break;
    started = true;
    for (const [k, re] of Object.entries(FIELDS)) if (re.test(f[1].trim())) out[k] = f[2].trim().slice(0, 200) || null;
  }
  const r = (out.result || '').toLowerCase().match(/\b(real|shortcut|blocked)\b/);
  out.status = r ? r[1] : null;
  return out;
}

module.exports = { observe, disputes, block, freshSession, filePathOf, writtenLines, before, codeSignals, EDIT_TOOL_RE, SHELL_TOOL_RE, MAX_RAISED };
