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
  '^[ \\t]*' + MARK + '[ \\t]*$(?:\\n[ \\t]*(?=\\n))?([\\s\\S]*?)(?=\\n[ \\t]*\\n|^[ \\t]*' + MARK + '[ \\t]*$|(?![\\s\\S]))',
  'gm'
);

// The marker opening a line, whatever follows it. Used only to tell a botched
// block apart from no block at all - see the note at the end of scan().
const MARKER_LINE_RE = new RegExp('^[ \\t]*(?:[-*+][ \\t]+)?' + MARK, 'm');

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
    // A full stop after the value is punctuation, not a qualifier: `Decision:
    // continue.` is `continue`. Measured on the termination scanner, on Codex.
    // Emphasis on the decision word alone, before a qualifier - `**continue**
    // - scoped to step 1` - is the same decision. It was read as
    // `**continue**---scoped` and rejected, and the answer tried first was to
    // tell the model "that word only, no bold": a format rule to paper over a
    // parser that did not read what it was given.
    const rawDecision = (field(b, 'Decision') || '').replace(/^(\*\*|__|\*|_)([A-Za-z-]+)\1/, '$2');
    const decision = rawDecision.toLowerCase().replace(/\.$/, '').replace(/\s+/g, '-').slice(0, 80);
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

  /*
   * A marker that opened a line and produced no block.
   *
   * "No block is not a violation" above is about a turn that wrote nothing -
   * most turns, and the reason this plugin nudges rather than gates. It was
   * never meant to cover a turn that wrote the marker and got the shape wrong,
   * but that is what it did: BLOCK_RE wants the marker alone on its line, and
   * one measured run opened with `[PLAN CHECK] Plan: ... Gate: ... Drift: ...
   * Decision: refocus` - every field present, the gate quoted, the decision
   * right, all of it on one line. It parsed as nothing, complained about
   * nothing, and the eval reported the plugin as not having fired.
   *
   * That is the worst of the three outcomes. A correct block should pass, a
   * malformed one should say what is missing, and neither should be silently
   * indistinguishable from an agent that ignored the checkpoint.
   *
   * Anchored to the line start on purpose: prose that mentions the marker
   * mid-sentence - this comment, the skill, a turn discussing the protocol -
   * is not an attempt at a block and must not be flagged as one.
   */
  if (out.blocks === 0 && MARKER_LINE_RE.test(unfenced(text))) {
    out.violations.push('a [PLAN CHECK] line that is not a block - put the marker on its own line and ' +
      'the fields under it, one per line: Plan, Gate, Drift, Decision');
  }
  return out;
}

module.exports = { scan, DECISIONS };
