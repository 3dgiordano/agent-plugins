'use strict';
/*
 * Scans an assistant's final message for a decision that was named but not
 * handed off -- an offer ("let me know if", "if you want", "should I"), a
 * fork ("it depends on", "alternatively", "two options"), a question in the
 * closing lines, or a `returned` part in a [COVERAGE CHECK] -- and for the
 * [HANDOFF] block the skill asks for at the close of a turn.
 *
 * The scan is narrow on purpose. Fenced code, inline code and quoted lines
 * are stripped first, so a message that documents or quotes these phrases is
 * not judged for using them; the [HANDOFF] block itself is stripped before
 * the question scan, so "Next: A or B?" inside it is not a trailing question.
 *
 * A hit is a signal, not a verdict: the hook only asks the agent to write the
 * block as a markdown list - status, situation in the reader's terms, options
 * as a list with a default, one next action. Not a fenced code block: fences
 * do not wrap.
 */

const CATEGORIES = [
  {
    kind: 'offer', // the assessment handed to the reader as a favour
    re: [
      /\blet\s+me\s+know\b/i,
      /\bif\s+you(?:'d| would)?\s+(?:want|like|prefer|need|wish)\b/i,
      /\b(?:would|do)\s+you\s+(?:like|want|need)\s+me\s+to\b/i,
      /\b(?:should|shall)\s+I\b/i,
      /\bwant\s+me\s+to\b/i,
      /\bup\s+to\s+you\b/i,
      /\byour\s+call\b/i,
      /\bhappy\s+to\s+(?:add|change|switch|do|implement|extend|adjust|revert|remove|rename|move|split)\b/i,
    ],
  },
  {
    kind: 'fork', // a fork named, but not written as a decision
    re: [
      /\b(?:it|this|that|which)\s+depends\s+on\b/i,
      /\bdepending\s+on\s+(?:whether|which|what|how|your|the)\b/i,
      /\balternatively\b/i,
      /\b(?:the\s+)?(?:other|alternative|second)\s+(?:option|approach|route|path)\b/i,
      /\b(?:two|three|a\s+few|several|multiple)\s+(?:options|ways|approaches|choices|paths|routes|alternatives)\b/i,
      /\b(?:option|approach|path|route)\s+(?:A|B|C|1|2|3)\b/,
      /\btrade-?offs?\b/i,
      /\b(?:we|you|I)\s+(?:could|can)\s+(?:either|also|instead)\b/i,
      /\b(?:which|what)\s+(?:would\s+you|do\s+you)\s+(?:prefer|want|like)\b/i,
    ],
  },
];

const CLOSING_LINES = 6; // a question this close to the end is asked of the reader

// The block the skill asks for. Same conventions as the sibling plugins:
// marker alone on its line, one field per line, template placeholders count
// as empty, the block ends at the first blank line.
const BLOCK_RE = /^[ \t]*\[HANDOFF\][ \t]*$([\s\S]*?)(?=\n[ \t]*\n|^[ \t]*\[HANDOFF\][ \t]*$|(?![\s\S]))/gm;
const STATUSES = ['done', 'needs-decision', 'blocked'];

const COVERAGE_BLOCK_RE = /^[ \t]*\[COVERAGE CHECK\][ \t]*$([\s\S]*?)(?=\n[ \t]*\n|(?![\s\S]))/gm;
const RETURNED_LINE_RE = /^[ \t]*[-*][ \t]*.+?:[ \t]*returned\b/im;

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&'); }

function placeholder(v) {
  return !v || /^<.*>$/.test(v) || /^(n\/a|tbd|-|\?)$/i.test(v);
}

function field(block, name) {
  const re = new RegExp('^[ \t]*[-*]?[ \t]*' + escapeRe(name) + '[ \t]*:[ \t]*(.*)$', 'im');
  const m = block.match(re);
  if (!m) return null;
  const v = m[1].trim();
  return placeholder(v) ? '' : v;
}

const FIELD_RE = /^(Status|Situation|Options|Default|Blocked-by|Next)\b/i;
const OPTION_ITEM_RE = /^[ \t]*[-*][ \t]+(\S.*)$/;

// Options as a list (the form to write): indented under Options, or sibling
// items "- A: …" until the next field. Inline "A | B. Default: A" is still
// accepted so an older close is not a finding; it is not the form to write.
function optionsOf(block) {
  const lines = block.split(/\r?\n/);
  const i = lines.findIndex((l) => /^[ \t]*[-*]?[ \t]*Options[ \t]*:/i.test(l));
  if (i < 0) return null;
  const inline = lines[i].replace(/^[ \t]*[-*]?[ \t]*Options[ \t]*:[ \t]*/i, '').trim();
  const subs = [];
  for (let j = i + 1; j < lines.length; j++) {
    const line = lines[j];
    if (/^[ \t]+[-*][ \t]+\S/.test(line)) { subs.push(line.trim()); continue; }
    const item = line.match(OPTION_ITEM_RE);
    if (item && !FIELD_RE.test(item[1])) { subs.push(line.trim()); continue; }
    break;
  }
  const alts = placeholder(inline) ? [] :
    inline.replace(/\bdefault\s*:.*$/i, '').split(/\s+\|\s+|\s+vs\.?\s+|\s+versus\s+/i).map((s) => s.trim()).filter((s) => !placeholder(s));
  const count = subs.length ? subs.filter((s) => !placeholder(s.replace(/^[-*][ \t]+/, ''))).length : alts.length;
  const hasDefault = /\bdefault\s*:\s*\S/i.test([inline, ...subs].join('\n')) || !!field(block, 'Default');
  return { count, hasDefault };
}

// Remove what must not be judged: fenced code, inline code, quoted lines.
function prose(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .split(/\r?\n/).filter((l) => !/^\s*>/.test(l)).join('\n');
}

function withoutBlocks(text) {
  return text.replace(BLOCK_RE, ' ');
}

// A line in the closing lines that ends on a question mark, once trailing
// markdown and punctuation are dropped.
function trailingQuestion(body) {
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-CLOSING_LINES);
  for (const l of lines) {
    const bare = l.replace(/[\s*_)\]"'.]+$/g, '');
    if (/\?$/.test(bare)) return l.replace(/\s+/g, ' ').slice(0, 80);
  }
  return null;
}

function returnedPart(text) {
  let m;
  while ((m = COVERAGE_BLOCK_RE.exec(text)) !== null) {
    const line = m[1].match(RETURNED_LINE_RE);
    if (line) { COVERAGE_BLOCK_RE.lastIndex = 0; return line[0].trim().replace(/\s+/g, ' ').slice(0, 80); }
  }
  return null;
}

/*
 * scan(text) -> {
 *   hits:       [{kind, phrase}]   offer / fork / question / returned found in the prose
 *   blocks:     n                  [HANDOFF] blocks found
 *   status:     string|null        Status of the last block, when one was read
 *   violations: [string]           what the skill asks for and did not get
 * }
 */
function scan(text) {
  const out = { hits: [], blocks: 0, status: null, violations: [] };
  if (typeof text !== 'string' || !text) return out;
  const body = prose(withoutBlocks(text));

  for (const cat of CATEGORIES) {
    for (const re of cat.re) {
      const m = body.match(re);
      if (m) { out.hits.push({ kind: cat.kind, phrase: m[0].replace(/\s+/g, ' ').slice(0, 80) }); break; }
    }
  }
  const q = trailingQuestion(body);
  if (q) out.hits.push({ kind: 'question', phrase: q });
  const r = returnedPart(text);
  if (r) out.hits.push({ kind: 'returned', phrase: r });

  let m;
  while ((m = BLOCK_RE.exec(text)) !== null) {
    out.blocks += 1;
    const b = m[1];
    const status = (field(b, 'Status') || '').toLowerCase().replace(/\s+/g, '-').slice(0, 40);
    // exact, or the status followed by a qualifier ("done (tests green)")
    const known = STATUSES.find((s) => status === s || (status.startsWith(s) && /^[-:(]/.test(status.slice(s.length))));
    out.status = known || status || null;
    if (!known) out.violations.push(`Status must be one of ${STATUSES.join(' | ')}, got "${status || '(empty)'}"`);
    if (!field(b, 'Situation')) out.violations.push('Situation is empty - one sentence, in the reader\'s terms: what do they have now?');
    if (known === 'needs-decision') {
      const opt = optionsOf(b);
      if (!opt || opt.count < 2) out.violations.push('Status is needs-decision but Options has fewer than two alternatives - the fork as a list, one choice per line, Default on its own line');
      else if (!opt.hasDefault) out.violations.push('Options has no Default - which one, and why');
    }
    if (known === 'blocked' && !field(b, 'Blocked-by')) out.violations.push('Status is blocked but Blocked-by is empty - the observed limit, and the tool that showed it');
    if (!field(b, 'Next')) out.violations.push('Next is empty - the one action asked of the reader, or: nothing');
  }

  if (out.hits.length && !out.blocks) {
    out.violations.unshift('a decision named without a handoff (' + out.hits.map((h) => `${h.kind}: "${h.phrase}"`).join('; ') +
      ') with no [HANDOFF] block - Status, Situation in the reader\'s terms, Options with a default, Next');
  }
  return out;
}

module.exports = { scan, STATUSES, CLOSING_LINES };
