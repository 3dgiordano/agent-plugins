'use strict';
/*
 * Scans an assistant message for the [PLAN CHECK] block the skill asks for.
 *
 * Unlike the other four scanners in this collection, this one looks for no
 * phrases. Drift is not a lexicon: "while I was in there I also fixed the
 * header parsing" is drift in a branch that was scoped narrow and is exactly
 * the right thing to say in a branch that was not, and nothing in the sentence
 * tells the two apart. Only the plan does, and the plan is an artifact this
 * process cannot read. So the check here is the block's own well-formedness -
 * whether the agent named an artifact, quoted a gate from it, and let the
 * drift and the decision agree.
 *
 * No hook reads this today: executive has no Stop hook, by design - it is the
 * one plugin in the set that never gates. The block is written for the reader,
 * and this scanner exists so the behavioural eval can score it the same way it
 * scores the other five, instead of settling for "the marker was present".
 */

/*
 * Same conventions as the other close scanners: the marker owns its line, but
 * an agent writing markdown decorates it - `**[PLAN CHECK]**`, `## [PLAN
 * CHECK]`, a trailing colon - and those are the same block. Backticks stay
 * out, so an inline-code mention remains documentation rather than a check.
 */
const MARK = '(?:#{1,6}[ \\t]*)?(?:\\*\\*|__)?\\[PLAN CHECK\\](?:[ \\t]*:)?(?:\\*\\*|__)?(?:[ \\t]*:)?';
const BLOCK_RE = new RegExp(
  '^[ \\t]*' + MARK + '[ \\t]*$([\\s\\S]*?)(?=\\n[ \\t]*\\n|^[ \\t]*' + MARK + '[ \\t]*$|(?![\\s\\S]))',
  'gm'
);

const DECISIONS = ['continue', 'refocus', 'revise-plan'];

// Emphasis around the field name, with the colon inside it or outside - see
// the note in handoff's lib/handoff.js. `- **Decision:** continue` parsed as a
// field that was present and empty.
const EM = '(?:\\*\\*|__|\\*|_)?';
const unemphasise = (s) => s.replace(/^(\*\*|__|\*|_)([\s\S]*)\1$/, '$2').trim();

function field(block, name) {
  const re = new RegExp('^[ \\t]*[-*]?[ \\t]*' + EM + name + EM + '[ \\t]*:' + EM + '[ \\t]*(.*)$', 'im');
  const m = block.match(re);
  if (!m) return null;
  const v = unemphasise(m[1].trim());
  // A template placeholder is not an answer, and neither is a shrug.
  if (!v || /^<.*>$/.test(v) || /^(n\/a|tbd|-|\?)$/i.test(v)) return '';
  return v;
}

// A fenced example of the block is documentation, not a check. Blank the
// fenced content character by character, newlines kept, so the line-anchored
// pattern still sees lines and the markers on them are gone.
function unfenced(text) {
  return text.replace(/```[\s\S]*?```/g, (f) => f.replace(/[^\n]/g, ' '));
}

/*
 * scan(text) -> {
 *   blocks:     n         [PLAN CHECK] blocks found
 *   decision:   string    the last block's decision, or null
 *   violations: [string]  what the skill asks for and did not get
 * }
 *
 * No block is not a violation: the check is a checkpoint for long or iterative
 * work, and most turns are neither. This plugin nudges and never gates.
 */
function scan(text) {
  const out = { blocks: 0, decision: null, violations: [] };
  if (typeof text !== 'string' || !text) return out;

  BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = BLOCK_RE.exec(unfenced(text))) !== null) {
    out.blocks += 1;
    const b = m[1];
    const plan = field(b, 'Plan');
    const gate = field(b, 'Gate');
    const drift = (field(b, 'Drift') || '').toLowerCase();
    const decision = (field(b, 'Decision') || '').toLowerCase().replace(/\s+/g, '-').slice(0, 80);
    /*
     * Exact, or the decision followed by a qualifier. The separator is
     * whatever punctuation the writer reached for: a comma is the commonest
     * and was missing from the first version of this list, which rejected
     * `continue, scoped strictly to steps 1-2` and `continue, explicitly
     * excluding the out-of-scope fixes` - two correct blocks out of three,
     * scored as malformed. What must NOT pass is a different word, so the
     * test is that a separator follows rather than more letters.
     */
    const known = DECISIONS.find((d) => decision === d ||
      (decision.startsWith(d) && /^[-—–,;:(\[]/.test(decision.slice(d.length))));

    if (plan === null || plan === '') {
      out.violations.push('no Plan - name the artifact that defines the active work, or say you could not find one');
    }
    if (gate === null || gate === '') {
      out.violations.push('no Gate - quote the line from that artifact that defines success');
    }
    if (field(b, 'Drift') === null) {
      out.violations.push('no Drift - name what is pulling away from the gate, or none');
    }
    if (!known) {
      out.violations.push(`Decision must be one of ${DECISIONS.join(' | ')}, got "${decision || '(empty)'}"`);
    } else if (/^none\b/.test(drift) && known !== 'continue') {
      out.violations.push(`Drift is none but Decision is "${known}" - with nothing pulling away, the decision is continue`);
    }
    out.decision = known || null;
  }
  return out;
}

module.exports = { scan, DECISIONS };
