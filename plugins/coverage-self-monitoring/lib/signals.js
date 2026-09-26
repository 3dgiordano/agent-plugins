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

const { userText } = require('./host.js');

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
  return { tools: 0, edits: 0, stubs: 0, files: {}, fired: { stubs: 0 } };
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
  turn.edits = (turn.edits || 0) + 1;
  const n = newStubsIn(toolInput, toolResponse);
  if (!n) return [];
  turn.stubs += n;
  const f = filePathOf(toolInput);
  if (f) bump(turn.files, f, n);
  if (!crossed(turn.stubs, STUBS_STEP, turn.fired)) return [];
  return [{ kind: 'stubs', count: turn.stubs, files: Object.keys(turn.files) }];
}

// How many enumerated items a prompt carries: bullet or numbered lines, in
// what the user wrote - not in a pasted transcript (host.js userText).
function partsOf(prompt) {
  if (typeof prompt !== 'string' || !prompt) return 0;
  const body = userText(prompt).replace(/```[\s\S]*?```/g, ' ');
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
  // Not "touch": "I have not touched the payment module" is scope kept, the
  // discipline executive asks for, not a part left undone (owner's decision,
  // 2026-09-25: 9 of 9 such session readings were restraint).
  /\bI\s+(?:did\s+not|didn't|have\s+not|haven't)\s+(?:(?:implement|address|cover|handle|finish|wire|test)(?:ed|d)?|got\s+to|get\s+to)\b/i,
  /\b(?:a\s+|the\s+)?(?:simplified|basic|minimal|initial|partial|naive|first[- ]pass|skeleton|bare[- ]bones|MVP|proof[- ]of[- ]concept)\s+(?:version|implementation|approach|solution|pass|form)\b/i,
  // Out of scope OF or FOR something - this turn (termination's reason), or a
  // named task ("out of scope for #155") - is scope kept, the owner's rule of
  // 2026-09-25; bare "out of scope, so I stubbed it" defers a part.
  /\bout\s+of\s+scope\b(?!\s+(?:of|for)\b)/i,
  /\bremaining\s+(?:work|items|tasks|parts|steps|pieces)\b/i,
  /\bstill\s+(?:needs?|need\s+to|to\s+do|to\s+be\s+done|pending|outstanding|open)\b/i,
  /\bcan\s+(?:be|get)\s+(?:added|done|handled|addressed|implemented|wired|finished|completed)\s+(?:later|separately|afterwards|in\s+a)\b/i,
  /\b(?:would|will)\s+(?:need|require)\s+(?:a\s+|further\s+|more\s+|additional\s+)?(?:separate|follow[- ]?up|additional|deeper|further)\s+(?:work|pass|change|PR|effort|investigation|task)\b/i,

  // Spanish. JS word characters are ASCII, so a trailing \b fails after an
  // accented letter: these are bounded with (?<!\p{L}) / (?!\p{L}), under the
  // u flag. The destination needs a qualifier, as in English: "hice los
  // cambios en un commit" is done work.
  /(?<!\p{L})(?:en|para)\s+(?:(?:un|una|el|la)\s+(?:pr[oó]xim[oa]|futur[oa]|siguiente|posterior)|otro|otra)\s+(?:PR|pull\s+request|commit|pasada|cambio|tarea|paso|iteraci[oó]n|turno|sesi[oó]n|ticket|issue)(?!\p{L})/iu,
  /(?<!\p{L})(?:en|para)\s+(?:un|una)\s+(?:PR|pull\s+request|commit|pasada|cambio|tarea|ticket|issue)\s+(?:aparte|separad[oa]|posterior|de\s+seguimiento)(?!\p{L})/iu,
  /(?<!\p{L})(?:como|para)\s+(?:un\s+)?(?:seguimiento|trabajo\s+futuro|mejora\s+futura|tarea\s+pendiente)(?!\p{L})/iu,
  /(?<!\p{L})(?:dej[eé]|dejo|dejando|queda|qued[oó]|quedan)\s+(?:[^.!?\n]{0,30}?\s+)?(?:como|para)\s+(?:un\s+|una\s+)?(?:pendiente|m[aá]s\s+adelante|despu[eé]s|seguimiento|ejercicio|el\s+futuro|luego)(?!\p{L})/iu,
  // TODO in capitals only: in Spanish "todo" is "everything", and under the i
  // flag "preparé el release con todo" and "queda para todo el equipo" read
  // as markers (2026-09-25 review: 10 of 92 session readings, all "con todo").
  /(?<!\p{L})(?:(?:[Dd]ej[eé]|[Dd]ejo|[Dd]ejando|[Qq]ueda|[Qq]ued[oó]|[Qq]uedan)\s+(?:[^.!?\n]{0,30}?\s+)?(?:como|para)\s+(?:un\s+|una\s+)?TODOs?|(?:[Dd]ej[eé]|[Aa]gregu[eé]|[Aa]grego|[Dd]ejando|[Cc]on)\s+(?:(?:un|unos|algunos|\d+)\s+)?TODOs?)(?!\p{L})/u,
  /(?<!\p{L})(?:todav[ií]a|a[uú]n)\s+no\s+(?:est[aá]n?\s+)?(?:implementad|hech|cubiert|resuelt|probad|testead|conectad|manejad)[oa]s?(?!\p{L})/iu,
  // Not a hypothesis "sin probar": that is its epistemic status, not a part
  // left undone ("[conjecture, sin probar] que un ejemplo suba la tasa").
  /(?<!\p{L})(?<!(?:hip[oó]tesis|conjetura|conjecture|supuesto)[\s,]+)sin\s+(?:implementar|probar|testear|terminar|conectar|cubrir)(?!\p{L})/iu,
  // Not "no toqué": scope kept, as "touch" above. The first person preterite
  // carries its accent: without it "para que no llegue a los managers" is a
  // subjunctive, "does not reach" (cycle 2). This reads the agent's text,
  // and agents write the accent.
  /(?<!\p{L})no\s+(?:implementé|abordé|cubrí|manejé|terminé|conecté|probé|testeé|llegué\s+a|alcancé\s+a)(?!\p{L})/iu,
  // Not "versión mínima": "exige una versión mínima de Node" is a requirement.
  // The article decides the rest: "una primera versión", "un esqueleto" is a
  // partial thing delivered; "la primera versión usaba...", "reutilizando el
  // esqueleto de termination" names a known one - its history, its reuse -
  // and "versión inicial 0.1.0" is a version number (2026-09-25 review: 9 of
  // 92 session readings). A possessive or a demonstrative names a known one
  // as the article does: "mi primera versión lo hacía...", "esa primera
  // versión" (cycle 2).
  /(?<!\p{L})(?:versi[oó]n|implementaci[oó]n|soluci[oó]n|aproximaci[oó]n)\s+(?:simplificada|b[aá]sica|inicial|parcial|ingenua|preliminar|reducida)(?!\p{L})(?!\s*v?\d)|(?<!\p{L})(?<!(?<!\p{L})(?:la|mi|tu|su|nuestra|esa|esta|aquella)\s+)(?:primera\s+(?:versi[oó]n|implementaci[oó]n|pasada)|prueba\s+de\s+concepto|un\s+(?:MVP|esqueleto))(?!\p{L})/iu,
  // As "out of scope" above: "fuera del alcance de #155", "de la migración",
  // "de este turno" is scope kept (2026-09-25 review, cycle 2: 4 readings).
  /(?<!\p{L})fuera\s+del?\s+alcance(?!\p{L})(?!\s+(?:de|del|para)\s)/iu,
  // "no son cosas que faltan", "ya no tiene trabajo pendiente" are negated,
  // like "no queda nada pendiente" below. "Lo que queda escrito / apuntado /
  // claro / en pie" is a resulting state, not work left (cycle 2).
  /(?<!\p{L})(?<!(?<!\p{L})no\s+(?:son|hay|quedan|tiene|tienen|tengo|tenemos)\s+)(?:trabajo|[ií]tems|tareas|partes|pasos|piezas|cosas)\s+(?:restantes?|pendientes?|que\s+faltan?|por\s+hacer)(?!\p{L})|(?<!\p{L})lo\s+que\s+(?:falta|queda)(?:\s+por\s+hacer)?(?!\p{L})(?!\s+(?:escrito|apuntado|anotado|registrado|documentado|guardado|claro|en\s+pie)(?!\p{L}))/iu,
  // "no falta nada" and "no queda nada pendiente" are negated, and stay out,
  // and so is "nada queda pendiente".
  /(?<!\p{L}|no\s|nada\s)(?:todav[ií]a\s+|a[uú]n\s+)?(?:falta|faltan|queda|quedan|sigue|siguen)\s+(?:todav[ií]a\s+|a[uú]n\s+)?(?:pendientes?|por\s+hacer|agregar|implementar|probar|testear|conectar|cubrir|manejar|terminar|resolver|documentar|migrar)(?!\p{L})/iu,
  /(?<!\p{L})(?:se\s+)?(?:puede|pueden|podr[ií]a|podr[ií]an)\s+(?:agregar|hacer|manejar|abordar|implementar|conectar|terminar|completar|sumar)(?:se)?\s+(?:m[aá]s\s+tarde|despu[eé]s|luego|m[aá]s\s+adelante|por\s+separado|aparte)(?!\p{L})/iu,
  /(?<!\p{L})(?:requerir[ií]a|necesitar[ií]a|har[ií]a\s+falta|llevar[ií]a)\s+(?:un\s+|una\s+|m[aá]s\s+|otro\s+|otra\s+)?(?:trabajo|pasada|cambio|PR|esfuerzo|investigaci[oó]n|tarea)\s+(?:aparte|adicional|separad[oa]|m[aá]s\s+profund[oa]|de\s+seguimiento|extra)(?!\p{L})/iu,
];

/*
 * The marker owns its line, but an agent writing markdown decorates it -
 * `**[X]**`, `## [X]`, a trailing colon. Those are the same block, and
 * refusing them meant a correctly closed turn read as no block at all:
 * a retrospective for a ledger that was written, and under a strict gate,
 * a blocked stop. Backticks stay out of the allowed set, so an inline-code
 * mention is still documentation rather than a closure.
 */
const BLOCK_RE = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?\[COVERAGE CHECK\](?:[ \t]*:)?(?:\*\*|__)?(?:[ \t]*:)?[ \t]*$(?:\n[ \t]*(?=\n))?([\s\S]*?)(?=\n[ \t]*\n|^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?\[COVERAGE CHECK\](?:[ \t]*:)?(?:\*\*|__)?(?:[ \t]*:)?[ \t]*$|(?![\s\S]))/gm;
/*
 * `- <part>: done`, and the separator is the agent's choice.
 *
 * Every run of the coverage eval case enumerated all three parts and closed
 * each one; the runs that were rejected differed from the run that passed only
 * in writing `- enqueue(item) — done` where the pattern wanted a colon. The
 * status word after the separator is what carries the meaning, so an em- or
 * en-dash is the same line. What does NOT loosen: `blocked` and `returned`
 * still have to be followed by their reason.
 */
/*
 * `misread` is not a state of a part. It answers the close scan: a phrase it
 * quoted as deferred work was something else - an option offered to the
 * owner, a quote, another sense of the word ("lo que queda" of a mechanism).
 * Like blocked and returned it needs what the phrase was. The Stop hook takes
 * it only for a phrase the scan actually raised (disputes() below).
 */
const PART_LINE_RE = /^[ \t]*[-*][ \t]*(.+?)[ \t]*[:—–][ \t]*(done|blocked|returned|misread)\b[ \t]*[-—–:(]?[ \t]*(.*)$/i;

// Phrases in double quotes (straight, curly or guillemets) are cited, not
// said - see the note on prose() in handoff's lib/handoff.js.
const QUOTED_RE = /"[^"\n]{0,200}"|“[^”\n]{0,200}”|«[^»\n]{0,200}»/g;

function prose(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(QUOTED_RE, ' ')
    .split(/\r?\n/).filter((l) => !/^\s*>/.test(l)).join('\n');
}

/*
 * scanClose(text) -> { deferrals: [phrase], blocks: n, parts: n, violations: [string] }
 */
/*
 * What BLOCK_RE must not read: a fenced example of the block. Showing the
 * format is what documentation and an instruction that teaches it both do, and
 * counting that as a declared block produced violations about a template - a
 * blocked stop, under a strict gate, for explaining the format.
 *
 * Fenced content is blanked character by character with the newlines kept, so
 * the line-anchored pattern below still sees lines and the markers on them are
 * gone. prose() above already does this for the phrase-level scan; this is the
 * same rule applied to the block scan.
 */
function unfenced(text) {
  return text.replace(/```[\s\S]*?```/g, (f) => f.replace(/[^\n]/g, ' '));
}

/*
 * The sentence a phrase was found in, so the reminder can show what was read
 * and the agent can say what it meant. Taken from the scanned prose (quotes
 * and code already blanked), cut to a window around the phrase, with double
 * quotes turned single so the reminder's own quoting stays balanced.
 */
const CONTEXT_MAX = 120;
/*
 * The same blanking as prose(), character for character, so offsets in it
 * are offsets in the original text. prose() collapses what it blanks and the
 * patterns are tuned on that; this is only for finding where a match was, so
 * the reviewer reads the sentence as written, code and quotes included (in
 * the collapsed text "pull `retry` into `http.js`" reads "pull retry into").
 */
function shadow(text) {
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  return text
    .replace(/```[\s\S]*?```/g, blank)
    .replace(/`[^`\n]*`/g, blank)
    .replace(QUOTED_RE, blank)
    .split('\n').map((l) => (/^\s*>/.test(l) ? blank(l) : l)).join('\n');
}

// Where the k-th occurrence of `phrase` in the collapsed body sits in the
// original: occurrences come in the same order in both. A run of spaces in
// the phrase may be a blanked span ("leave the other `client.js` notes"),
// one space in the body and eleven in the shadow, so spaces match any run.
// Returns [index, length] in the original, or null: the caller falls back.
function originalIndex(body, index, phrase, shadowed) {
  const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'g');
  let k = 0;
  for (let m = re.exec(body); m && m.index < index; m = re.exec(body)) k += 1;
  re.lastIndex = 0;
  for (let m = re.exec(shadowed); m; m = re.exec(shadowed)) {
    if (k === 0) return [m.index, m[0].length];
    k -= 1;
  }
  return null;
}

function contextOf(body, index, length) {
  // A sentence ends at a newline, or at . ! ? followed by space or the end -
  // not at the dot of `http.js` or `v1.2`.
  const ends = (i) => body[i] === '\n' || (/[.!?]/.test(body[i]) && (i + 1 >= body.length || /\s/.test(body[i + 1])));
  let a = index;
  while (a > 0 && !ends(a - 1)) a -= 1;
  let b = index + length;
  while (b < body.length && !ends(b)) b += 1;
  if (b < body.length && body[b] !== '\n') b += 1;
  while (a < index && /[\s\-*•]/.test(body[a])) a += 1; // a list marker is not the sentence
  let from = a;
  let to = b;
  if (to - from > CONTEXT_MAX) {
    const side = Math.max(0, Math.floor((CONTEXT_MAX - length) / 2));
    from = Math.max(a, index - side);
    to = Math.min(b, index + length + side);
  }
  const text = body.slice(from, to).replace(/\s+/g, ' ').trim().replace(/"/g, "'");
  return (from > a ? '...' : '') + text + (to < b ? '...' : '');
}

/*
 * The other blocks of this collection are reports by design: a [HANDOFF]
 * lists options ("B: empezar por el esqueleto y dejar los casos para
 * después"), a [TERMINATION CHECK] weighs what blocks "the remaining work",
 * an [EPISTEMIC CLOSE] says what is "still open". Read as prose they are
 * deferrals (2026-09-25 review: options offered were 5 of 92 session
 * readings, a termination Evidence line 1 of 11 bench readings). A block
 * runs from its marker line to the first blank line, as the skills write it;
 * it is blanked character by character so offsets stay the original's.
 * Coverage's own blocks are read as they always were.
 */
// [INTEGRITY CHECK] too: the Route of a blocked part says what it still needs.
const REPORT_MARKER_RE = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?\[(?:HANDOFF|TERMINATION CHECK|EPISTEMIC CLOSE|PLAN CHECK|PERSISTENCE CHECK|INTEGRITY CHECK)\]/;
function reports(text) {
  const lines = text.split('\n');
  let inside = false;
  for (let i = 0; i < lines.length; i++) {
    if (!inside && REPORT_MARKER_RE.test(lines[i])) inside = true;
    else if (inside && !lines[i].trim()) { inside = false; continue; }
    if (inside) lines[i] = lines[i].replace(/[^\r]/g, ' ');
  }
  return lines.join('\n');
}

/*
 * A question to the owner is a handoff, not a silent drop: "¿Sigo con lo
 * que falta del test A, o preferís que primero arregle...?" asks whether to
 * continue, and whether it is formulated well is handoff's to judge.
 * (2026-09-25 review, cycle 2: 4 of 138 readings.) The sentence is the
 * phrase's own, bounded as contextOf() bounds it.
 */
function question(body, index, length) {
  let a = index;
  while (a > 0 && body[a - 1] !== '\n' && !/[.!?]/.test(body[a - 1])) a -= 1;
  let b = index + length;
  while (b < body.length && body[b] !== '\n' && !/[.!?]/.test(body[b])) b += 1;
  return body[b] === '?' || body.slice(a, index).includes('¿');
}

// What a phrase and a dispute of it are compared on: case, spacing and the
// quotes or emphasis an agent wraps a phrase in do not make two phrases.
function phraseKey(s) {
  return String(s || '').normalize('NFC').toLowerCase()
    .replace(/^[\s"'`*“”«»]+|[\s"'`*“”«»]+$/g, '')
    .replace(/\s+/g, ' ').trim();
}

/*
 * scanClose(text, ctx) - ctx.report: the turn answered a request with no
 * enumerated parts and edited no file. Its "what is left" is a status
 * report, not a part it did not deliver: measured 2026-09-25, a greeting
 * answered with the ledger's open items read as "work deferred", and so did
 * "what is the state of the project?". The deferrals are still counted for
 * the log; only the finding is dropped. A block the agent did write is
 * still checked.
 */
/*
 * ctx.disputed: phrase keys this session already answered as misread; they
 * are not raised again. out.found carries, for each phrase raised, the
 * pattern that matched and the sentence it was in; out.misreads the lines
 * the agent wrote as `- "<phrase>": misread - <what it was>`.
 */
function scanClose(text, ctx) {
  const out = { deferrals: [], found: [], misreads: [], blocks: 0, parts: 0, violations: [] };
  if (typeof text !== 'string' || !text) return out;
  const body = prose(reports(text));
  const shadowed = shadow(reports(text));
  const disputed = new Set(ctx && Array.isArray(ctx.disputed) ? ctx.disputed : []);
  const where = (m) => {
    const at = originalIndex(body, m.index, m[0], shadowed);
    return at ? contextOf(text, at[0], at[1]) : contextOf(body, m.index, m[0].length);
  };

  // The first match of each pattern that was not disputed: a disputed "lo que
  // queda" early in the message must not hide a "lo que queda por hacer" later.
  DEFERRAL_RES.forEach((re, i) => {
    const all = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m;
    let phrase = null;
    while ((m = all.exec(body)) !== null) {
      const p = m[0].replace(/\s+/g, ' ').slice(0, 80);
      if (!disputed.has(phraseKey(p)) && !question(body, m.index, m[0].length)) { phrase = p; break; }
      if (!m[0]) all.lastIndex += 1;
    }
    if (!phrase) return;
    out.deferrals.push(phrase);
    out.found.push({ phrase, pattern: i, source: re.source.slice(0, 120), context: where(m) });
  });

  let m;
  while ((m = BLOCK_RE.exec(unfenced(text))) !== null) {
    out.blocks += 1;
    let blockParts = 0;
    for (const line of m[1].split(/\r?\n/)) {
      const p = line.match(PART_LINE_RE);
      if (!p) continue;
      blockParts += 1;
      const [, part, state, rest] = p;
      const name = part.trim().slice(0, 80);
      const reason = rest.trim().replace(/^[-:(]\s*/, '').replace(/\)\s*$/, '');
      if (/^misread$/i.test(state)) {
        if (!reason || /^<.*>$/.test(reason)) out.violations.push(`"${phraseKey(name)}": misread with no reason - say what the phrase was: an option offered, a quote, another sense of the word`);
        else out.misreads.push({ phrase: name, reason: reason.slice(0, 200) });
        continue;
      }
      out.parts += 1;
      if (/^(blocked|returned)$/i.test(state) && (!reason || /^<.*>$/.test(reason))) {
        out.violations.push(`"${name}": ${state.toLowerCase()} with no reason - blocked needs the observed limit, returned needs the choice the owner must make`);
      }
    }
    if (blockParts === 0) out.violations.push('[COVERAGE CHECK] block with no part lines (- <part>: done | blocked - <observed reason> | returned - <the choice>)');
  }

  if (out.deferrals.length && !out.blocks && !(ctx && ctx.report)) {
    out.violations.unshift('work that reads as deferred (' + out.deferrals.map((d) => `"${d}"`).join('; ') +
      ') with no [COVERAGE CHECK] block - close each part as done, blocked with the observed reason, or returned to the owner');
  }
  return out;
}

// A report turn (see scanClose): the prompt listed no parts and nothing was edited.
function reportTurn(parts, turn) {
  return parts === 0 && !!turn && (turn.edits || 0) === 0;
}

function summary(turn) {
  return { tools: turn.tools, edits: turn.edits || 0, stubs: turn.stubs, stubFiles: Object.keys(turn.files).length };
}

/*
 * disputes(misreads, raised) - the misread lines that answer a phrase the scan
 * raised (the previous turn's, or this one's), each joined to what was found.
 * A misread naming nothing raised is not taken: the answer cannot silence a
 * phrase in advance.
 */
function disputes(misreads, raised) {
  const out = [];
  for (const m of misreads || []) {
    const k = phraseKey(m.phrase);
    const hit = (raised || []).find((f) => { const fk = phraseKey(f.phrase); return fk && (k === fk || k.includes(fk)); });
    if (hit && !out.some((d) => phraseKey(d.phrase) === phraseKey(hit.phrase))) out.push(Object.assign({}, hit, { reason: m.reason }));
  }
  return out;
}

module.exports = { freshTurn, observe, partsOf, scanClose, reportTurn, disputes, phraseKey, countStubs, summary, PARTS_MIN, STUBS_STEP };
