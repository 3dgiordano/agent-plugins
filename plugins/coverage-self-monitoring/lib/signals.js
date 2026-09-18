'use strict';
/*
 * Coverage signals: the traces a partial delivery leaves that an agent does
 * not weigh - it produces the tractable subset of a task with the same
 * fluency as the whole thing.
 *
 * Three signals:
 *   parts     - the user's prompt enumerates PARTS_MIN or more items
 *               (a ledger is worth writing before starting)
 *   stubs     - stub / placeholder markers written this turn reach
 *               STUBS_STEP (and every multiple): each one is a part of the
 *               request that is not done
 *   deferrals - the final message defers work ("in a follow-up", "left as a
 *               TODO", "simplified version", "still needs") with no
 *               [COVERAGE CHECK] block closing each part
 *
 * Everything is scoped to the current *turn* (since the user's last message).
 */

const PARTS_MIN = 3;
const STUBS_STEP = 3;
const MAX_KEYS = 64;

const EDIT_TOOL_RE = /edit|write|notebook|patch|replace|create_file|apply_diff/i;

// Markers that say "not done here". Deliberately excludes bare "stub" (test
// doubles) and "mock": those are legitimate code, not deferrals.
/*
 * A marker inside a STRING LITERAL is data, not a deferral the agent just
 * wrote: `getAttribute('placeholder')` reads a DOM attribute, and a test
 * fixture or corpus line that quotes "// TODO" is describing a marker, not
 * leaving one. So every rule is tested against the line with its quoted spans
 * blanked out.
 *
 * Two rules look inside a string ON PURPOSE - the marker is the payload of a
 * throw, or of a Python `pass` comment - and are marked `raw` so they see the
 * line as written.
 */
const STUB_RES = [
  { re: /\b(?:TODO|FIXME|XXX|HACK)\b/ },
  { re: /\bnot\s+implemented\b/i },
  { re: /\bNotImplemented(?:Error|Exception)?\b/ },
  { re: /\bunimplemented!?\b/i },
  // Unlike TODO/FIXME/XXX/HACK, "placeholder" is an ordinary word in UI code -
  // a DOM attribute, a property, a prop name - so it only counts as a stub
  // when it appears in a COMMENT.
  { re: /(?:\/\/|#|\/\*|^\s*\*|<!--)[^\n]*\bplaceholder\b/i },
  { re: /\b(?:rest|remainder)\s+of\s+(?:the\s+)?(?:code|file|implementation|logic|function|class)(?:\s+goes)?\s+here\b/i },
  { re: /(?:\/\/|#|\/\*)\s*\.\.\.\s*(?:\*\/)?\s*$/m },
  { re: /\.\.\.\s*(?:rest|more|remaining|etc\.?)\b/i },
  { re: /throw\s+new\s+Error\(\s*['"`](?:TODO|not implemented|unimplemented|implement me)/i, raw: true },
  { re: /\bpass\s*#\s*(?:TODO|FIXME|stub|later|implement)/i, raw: true },
  { re: /\bimplement\s+(?:this|me)\s+later\b/i },
  { re: /\bfill\s+(?:this\s+)?in\s+later\b/i },
  { re: /\bleft\s+as\s+(?:an\s+)?exercise\b/i },
];

// Blank out double-, single- and backtick-quoted spans, keeping the line's
// length and shape so the end-anchored rules still see a line end.
function unquoted(line) {
  return line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, (s) => ' '.repeat(s.length));
}

function freshTurn() {
  return { tools: 0, stubs: 0, files: {}, fired: { stubs: 0 } };
}

function bump(map, key, n) {
  if (!(key in map) && Object.keys(map).length >= MAX_KEYS) return;
  map[key] = (map[key] || 0) + n;
}

function crossed(count, threshold, fired) {
  if (count < threshold) return false;
  const level = Math.floor(count / threshold) * threshold;
  if (fired.stubs >= level) return false;
  fired.stubs = level;
  return true;
}

// One line is one deferral, however many markers it carries.
function countStubs(text) {
  if (typeof text !== 'string' || !text) return 0;
  let n = 0;
  for (const line of text.split(/\r?\n/)) {
    const bare = unquoted(line);
    if (STUB_RES.some((r) => r.re.test(r.raw ? line : bare))) n += 1;
  }
  return n;
}

function filePathOf(input) {
  if (!input || typeof input !== 'object') return null;
  for (const k of ['file_path', 'path', 'notebook_path', 'target_file', 'filePath', 'file']) {
    if (typeof input[k] === 'string' && input[k]) return input[k];
  }
  return null;
}

// Markers introduced by this call: those in what was written, minus those in
// what it replaced - moving an existing TODO around is not a new deferral.
//
// The best source is the host's structured result: Claude Code's Write and
// Edit both return a `structuredPatch` (unified-diff hunks with '+'/'-'
// lines) and Write returns `type: 'create' | 'update'`. With that, a rewrite
// of a legacy file full of old TODOs nets to zero and a brand-new file made of
// TODOs counts in full. Without it (Cursor, or a host that sends no result):
// old/new pairs net as before, a bare snippet counts what it adds, and a
// whole-file `content` with nothing to compare against is not counted at all
// - a missed new file is cheaper than a false alarm on every rewrite.
function newStubsIn(input, response) {
  const r = response && typeof response === 'object' ? response : null;
  if (r && Array.isArray(r.structuredPatch) && r.structuredPatch.length) {
    let added = 0;
    let removed = 0;
    for (const hunk of r.structuredPatch) {
      if (!hunk || !Array.isArray(hunk.lines)) continue;
      for (const line of hunk.lines) {
        if (typeof line !== 'string') continue;
        if (line[0] === '+') added += countStubs(line.slice(1));
        else if (line[0] === '-') removed += countStubs(line.slice(1));
      }
    }
    return Math.max(0, added - removed);
  }
  if (r && r.type === 'create') {
    return countStubs(typeof r.content === 'string' ? r.content : (input && typeof input.content === 'string' ? input.content : ''));
  }
  if (r && r.type === 'update') return 0; // an update with no patch changed nothing

  if (!input || typeof input !== 'object') return 0;
  let added = 0;
  let removed = 0;
  let hasOld = false;
  for (const k of ['old_string', 'old_str', 'old_source', 'old_content']) {
    if (typeof input[k] === 'string') { removed += countStubs(input[k]); hasOld = true; }
  }
  if (Array.isArray(input.edits)) {
    for (const e of input.edits) {
      if (!e || typeof e !== 'object') continue;
      added += countStubs(e.new_string || e.new_str || '');
      removed += countStubs(e.old_string || e.old_str || '');
      hasOld = true;
    }
  }
  for (const k of ['new_string', 'new_str', 'code_edit', 'new_source', 'new_content', 'replacement']) {
    if (typeof input[k] === 'string') added += countStubs(input[k]);
  }
  if (!hasOld && added === 0) return 0; // only whole-file content, nothing to compare against
  return Math.max(0, added - removed);
}

/*
 * Record one tool call; return [{kind:'stubs', count, files:[...]}] when the
 * stub threshold is crossed, else [].
 */
function observe(turn, toolName, toolInput, toolResponse) {
  turn.tools += 1;
  if (!EDIT_TOOL_RE.test(String(toolName || ''))) return [];
  const n = newStubsIn(toolInput, toolResponse);
  if (!n) return [];
  turn.stubs += n;
  const f = filePathOf(toolInput);
  if (f) bump(turn.files, f, n);
  if (!crossed(turn.stubs, STUBS_STEP, turn.fired)) return [];
  return [{ kind: 'stubs', count: turn.stubs, files: Object.keys(turn.files) }];
}

// How many enumerated items a prompt carries: bullet or numbered lines.
function partsOf(prompt) {
  if (typeof prompt !== 'string' || !prompt) return 0;
  const body = prompt.replace(/```[\s\S]*?```/g, ' ');
  return body.split(/\r?\n/).filter((l) => /^\s*(?:[-*•]|\d+[.)]|[a-z][.)])\s+\S/i.test(l)).length;
}

// --- final-message scan ----------------------------------------------------

// Deferral of a *part* (what was not delivered). The *reason* side - "given
// the complexity", "out of scope for this turn" - belongs to the
// termination-self-monitoring scanner and is excluded here.
const DEFERRAL_RES = [
  /\bin\s+a\s+(?:follow[- ]?up|separate|later|future|subsequent|next)\s+(?:PR|pull request|pass|change|task|step|iteration|commit|turn|session|ticket|issue)\b/i,
  /\b(?:as|for)\s+(?:a\s+)?(?:follow[- ]?up|future\s+work)\b/i,
  // The thing left behind can be named, not just pronominalised: "left the
  // migration as a TODO" as well as "left it as a TODO". Bounded and lazy so
  // it cannot run across a sentence boundary.
  /\b(?:left|leave|leaving)\s+(?:[^.!?]{0,30}?\s+)?(?:as|for)\s+(?:a\s+|an\s+)?(?:TODO|later|follow[- ]?up|exercise|future)\b/i,
  /\b(?:left|added|add|leaving|with)\s+(?:a\s+|some\s+|\d+\s+)?TODOs?\b/i,
  /\bnot\s+yet\s+(?:implemented|done|addressed|covered|handled|wired|tested)\b/i,
  // "did not wire" takes the base form, "have not wired" the participle, so
  // the verbs are matched with an optional -d/-ed rather than listed twice.
  /\bI\s+(?:did\s+not|didn't|have\s+not|haven't)\s+(?:(?:implement|address|cover|handle|touch|finish|wire|test)(?:ed|d)?|got\s+to|get\s+to)\b/i,
  /\b(?:a\s+|the\s+)?(?:simplified|basic|minimal|initial|partial|naive|first[- ]pass|skeleton|bare[- ]bones|MVP|proof[- ]of[- ]concept)\s+(?:version|implementation|approach|solution|pass|form)\b/i,
  /\bout\s+of\s+scope\b(?!\s+(?:of|for)\s+(?:this|the\s+current|a\s+single|one)\s+(?:turn|response|session|pass|message|conversation))/i,
  /\bremaining\s+(?:work|items|tasks|parts|steps|pieces)\b/i,
  /\bstill\s+(?:needs?|need\s+to|to\s+do|to\s+be\s+done|pending|outstanding|open)\b/i,
  /\bcan\s+(?:be|get)\s+(?:added|done|handled|addressed|implemented|wired|finished|completed)\s+(?:later|separately|afterwards|in\s+a)\b/i,
  /\b(?:would|will)\s+(?:need|require)\s+(?:a\s+|further\s+|more\s+|additional\s+)?(?:separate|follow[- ]?up|additional|deeper|further)\s+(?:work|pass|change|PR|effort|investigation|task)\b/i,
];

const BLOCK_RE = /^[ \t]*\[COVERAGE CHECK\][ \t]*$([\s\S]*?)(?=\n[ \t]*\n|^[ \t]*\[COVERAGE CHECK\][ \t]*$|(?![\s\S]))/gm;
const PART_LINE_RE = /^[ \t]*[-*][ \t]*(.+?)[ \t]*:[ \t]*(done|blocked|returned)\b[ \t]*[-:(]?[ \t]*(.*)$/i;

function prose(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .split(/\r?\n/).filter((l) => !/^\s*>/.test(l)).join('\n');
}

/*
 * scanClose(text) -> { deferrals: [phrase], blocks: n, parts: n, violations: [string] }
 */
function scanClose(text) {
  const out = { deferrals: [], blocks: 0, parts: 0, violations: [] };
  if (typeof text !== 'string' || !text) return out;
  const body = prose(text);

  for (const re of DEFERRAL_RES) {
    const m = body.match(re);
    if (m) out.deferrals.push(m[0].replace(/\s+/g, ' ').slice(0, 80));
  }

  let m;
  while ((m = BLOCK_RE.exec(text)) !== null) {
    out.blocks += 1;
    let blockParts = 0;
    for (const line of m[1].split(/\r?\n/)) {
      const p = line.match(PART_LINE_RE);
      if (!p) continue;
      out.parts += 1;
      blockParts += 1;
      const [, part, state, rest] = p;
      const name = part.trim().slice(0, 80);
      const reason = rest.trim().replace(/^[-:(]\s*/, '').replace(/\)\s*$/, '');
      if (/^(blocked|returned)$/i.test(state) && (!reason || /^<.*>$/.test(reason))) {
        out.violations.push(`"${name}": ${state.toLowerCase()} with no reason - blocked needs the observed limit, returned needs the choice the owner must make`);
      }
    }
    if (blockParts === 0) out.violations.push('[COVERAGE CHECK] block with no part lines (- <part>: done | blocked - <observed reason> | returned - <the choice>)');
  }

  if (out.deferrals.length && !out.blocks) {
    out.violations.unshift('work deferred (' + out.deferrals.map((d) => `"${d}"`).join('; ') +
      ') with no [COVERAGE CHECK] block - close each part as done, blocked with the observed reason, or returned to the owner');
  }
  return out;
}

function summary(turn) {
  return { tools: turn.tools, stubs: turn.stubs, stubFiles: Object.keys(turn.files).length };
}

module.exports = { freshTurn, observe, partsOf, scanClose, countStubs, summary, PARTS_MIN, STUBS_STEP };
