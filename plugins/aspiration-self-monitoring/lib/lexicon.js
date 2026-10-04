'use strict';
/*
 * Scans an assistant message for a completion claim - the work called done,
 * good enough, or looking right - and for the [ASPIRATION CHECK] block the
 * skill asks for when one is made.
 *
 * The scan does not judge the work. It checks what can be checked:
 *   - files edited and not reviewed since their last change, at a close (a
 *     claim or a block), unless the block says the review is blocked - and at
 *     the end of a turn with no claim and no block, when it edited files and
 *     leaves some unreviewed: that is a hand-over too;
 *   - a claim after edits this turn with no block;
 *   - the block's shape: Criterion, Reviewed and Found present, not none,
 *     Remainder one of meets | defect | unverified | blocked. unverified - the
 *     result reviewed, the source it is held against out of reach - unlike
 *     blocked, still needs the edited files reviewed;
 *   - a close short of the objective - defect, unverified or blocked - is
 *     asked what was not looked at that could still move the result closer,
 *     with how many of the project's files the session read.
 * Whether the criterion is the letter, or a job title standing in for the
 * property, and whether Found shows the criterion met, are the skill's call:
 * this file cannot read, see or hear the result.
 *
 * Counts come from lib/signals.js. With no counts (a message scanned on its
 * own), the claim is read as closing a delivery and no review is judged.
 *
 * Narrow on purpose. "Status: done" inside another plugin's block is not a
 * claim. A quoted or fenced "this is done" is not said. A sentence that does
 * not open on the claim is not said either, and "it is done in the
 * constructor" is a description, not a close.
 */

const START = '(?:^|[.!?\\n]\\s*)';
const END = '(?![\\p{L}\\p{N}])';
// The English claim ends its clause: "It is done." / "It is done, and ...".
const CLOSE = '(?=\\s*(?:[.!,;:)]|\\n|$))';

const CLAIMS = [
  new RegExp(START + "(?:this|that|it)(?:'s| is) (?:now )?(?:done|complete|finished|good enough)" + CLOSE, 'iu'),
  new RegExp(START + "I(?:'d| would) call (?:this|it) done" + CLOSE, 'iu'),
  new RegExp(START + "(?:[\\p{L}\\p{N}']+\\s+){0,8}(?:look|read)s? (?:good|fine|right) now" + END, 'iu'),
  new RegExp(START + '(?:ya )?est[aá] (?:listo|lista|hecho|hecha|terminado|terminada)' + END, 'iu'),
  new RegExp(START + 'queda (?:listo|lista|hecho|hecha|terminado|terminada)' + END, 'iu'),
  new RegExp(START + '(?:lo )?doy por (?:terminado|terminada|hecho|hecha|cerrado|cerrada|bueno|buena)' + END, 'iu'),
  new RegExp(START + 'con esto (?:basta|alcanza)' + END, 'iu'),
  new RegExp(START + 'se ve(?:n)? bien(?: ahora)?' + END, 'iu'),
];

const REMAINDERS = ['meets', 'defect', 'unverified', 'blocked'];
// The closes that stop short of the objective.
const SHORT = ['defect', 'unverified', 'blocked'];
const EMPTY = /^(?:none|ninguno|ninguna|nada|no)$/i;

const EM = '(?:\\*\\*|__|\\*|_)?';
const unemphasise = (s) => s.replace(/^(\*\*|__|\*|_)([\s\S]*)\1$/, '$2').trim();

const BLOCK_RE = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?\[ASPIRATION CHECK\](?:[ \t]*:)?(?:\*\*|__)?(?:[ \t]*:)?[ \t]*$(?:\n[ \t]*(?=\n))?([\s\S]*?)(?=\n[ \t]*\n|^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?\[ASPIRATION CHECK\](?:[ \t]*:)?(?:\*\*|__)?(?:[ \t]*:)?[ \t]*$|(?![\s\S]))/gm;

const QUOTED_RE = /"[^"\n]{0,200}"|“[^”\n]{0,200}”|«[^»\n]{0,200}»/g;

function field(block, name) {
  const re = new RegExp('^[ \t]*[-*]?[ \t]*' + EM + name + EM + '[ \t]*:' + EM + '[ \t]*(.*)$', 'im');
  const m = block.match(re);
  if (!m) return null;
  const v = unemphasise(m[1].trim());
  if (!v || /^<.*>$/.test(v) || /^(n\/a|tbd|-|\?)$/i.test(v)) return '';
  return v;
}

function prose(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(QUOTED_RE, ' ')
    .split(/\r?\n/).filter((l) => !/^\s*>/.test(l)).join('\n');
}

function unfenced(text) {
  return text.replace(/```[\s\S]*?```/g, (f) => f.replace(/[^\n]/g, ' '));
}

function token(value, list) {
  const v = (value || '').toLowerCase().replace(/\.$/, '').trim().replace(/\s+/g, '-').slice(0, 80);
  return list.find((t) => v === t || (v.startsWith(t) && /^[-—–,;:([]/.test(v.slice(t.length)))) || '';
}

function empty(v) {
  if (!v) return true;
  return EMPTY.test(v.replace(/\.$/, '').trim());
}

const clip = (s) => String(s).replace(/\s+/g, ' ').slice(0, 40);

/*
 * opts.edits       edits this turn (undefined: unknown)
 * opts.unreviewed files edited and not reviewed since (undefined: unknown)
 * opts.looked     { read, files, more }: project files the session opened,
 *                 and the project's file count (lib/signals.js looked)
 */
function scan(text, opts) {
  const o = opts || {};
  const out = { claims: [], blocks: 0, remainder: null, violations: [] };
  if (typeof text !== 'string' || !text) return out;
  const body = prose(text);

  for (const re of CLAIMS) {
    const m = body.match(re);
    if (m) { out.claims.push({ phrase: m[0].replace(/^[.!?\s]+/, '').replace(/\s+/g, ' ').trim().slice(0, 80) }); break; }
  }

  let m;
  const re = new RegExp(BLOCK_RE.source, BLOCK_RE.flags);
  while ((m = re.exec(unfenced(text))) !== null) {
    out.blocks += 1;
    const b = m[1];
    const remainder = token(field(b, 'Remainder') || '', REMAINDERS);
    if (!field(b, 'Criterion')) out.violations.push('no Criterion - name the property a practitioner would reject the result on');
    if (empty(field(b, 'Reviewed'))) out.violations.push('no Reviewed - name how the result was read, viewed, run or played after the last change');
    if (empty(field(b, 'Found'))) out.violations.push('Found is empty - name what the review found against the criterion');
    if (!remainder) {
      out.violations.push(`Remainder must be one of ${REMAINDERS.join(' | ')}, got "${clip(field(b, 'Remainder') || '(empty)')}"`);
    }
    out.remainder = remainder || null;
  }

  const closing = out.claims.length > 0 || out.blocks > 0;
  const delivered = o.edits === undefined ? true : o.edits > 0;
  if (out.claims.length && !out.blocks && delivered) {
    out.violations.unshift('a completion claim (' + out.claims.map((c) => `"${c.phrase}"`).join('; ') +
      ') with no [ASPIRATION CHECK] block');
  }
  // What an unreviewed edit needs, and the fact an agent most often lacks when
  // it gives up the review: a refusal is about the command refused, and the
  // project usually documents how its work is run.
  const how = (n) => ` - read, view, run or render ${n === 1 ? 'it' : 'them'} the way the project documents - one refused command says that command is not allowed, not that nothing runs`;
  if (closing && o.unreviewed > 0 && out.remainder !== 'blocked') {
    out.violations.unshift(`${o.unreviewed} edited file${o.unreviewed === 1 ? '' : 's'} not reviewed since the last change${how(o.unreviewed)}`);
  } else if (!closing && o.edits > 0 && o.unreviewed > 0) {
    // A hand-over with no claim and no block still hands the result over:
    // "please open it and check it" passes the review to the reader.
    out.violations.unshift(`${o.unreviewed} edited file${o.unreviewed === 1 ? '' : 's'} handed over with no review since the last change${how(o.unreviewed)}`);
  }
  // A close short of the objective - a defect left, a review that could not
  // be done, a source that could not be had - is where the search stopped. The
  // question is what was not looked at, not how hard to try: the next look is
  // what can move the result, and the honest close stays open if none can.
  if (SHORT.includes(out.remainder)) {
    const l = o.looked;
    const fact = l && l.files ? ` (this session read ${l.read} of the project's ${l.more ? 'more than ' : ''}${l.files} files)` : '';
    out.violations.push(`Remainder is ${out.remainder}${fact} - before you stop short of the objective, list what you have not looked at that could still move the result closer: ` +
      'in the project (its files, its own tools and instructions), in how the result is used (run, viewed, read as its user will meet it), and in the source past the first pages you found. ' +
      'If one of them could, look at it now and compare again - if none could, keep the close and name in Reviewed what you tried');
  }
  return out;
}

module.exports = { scan, REMAINDERS };
