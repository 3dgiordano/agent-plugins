'use strict';
/*
 * Scans an assistant message for [EPISTEMIC CLOSE] blocks and inline claim
 * tags, and reports which closure rules were broken.
 *
 * The gate is deliberately narrow: it only judges blocks the agent chose to
 * write. No block = no closure declared = nothing to judge. This keeps false
 * positives near zero and gives the agent nothing to game except the block's
 * own content, which stays visible to the human.
 *
 * Rules (mirroring the skill):
 *   Status: conjecture  -> requires a non-empty "Falsifier:" line
 *   Status: verified    -> requires a non-empty "Verified by:" line
 *   any block           -> requires a non-empty "Scope:" line
 */

// A block starts with the marker alone on its line. Mentioning the marker in
// prose or inside backticks (as documentation does) is not a closure.
/*
 * The marker owns its line, but an agent writing markdown decorates it -
 * `**[X]**`, `## [X]`, a trailing colon. Those are the same block, and
 * refusing them meant a correctly closed turn read as no block at all:
 * a retrospective for a ledger that was written, and under a strict gate,
 * a blocked stop. Backticks stay out of the allowed set, so an inline-code
 * mention is still documentation rather than a closure.
 */
const BLOCK_RE = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?\[EPISTEMIC CLOSE\](?:[ \t]*:)?(?:\*\*|__)?(?:[ \t]*:)?[ \t]*$(?:\n[ \t]*(?=\n))?([\s\S]*?)(?=\n[ \t]*\n|^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?\[EPISTEMIC CLOSE\](?:[ \t]*:)?(?:\*\*|__)?(?:[ \t]*:)?[ \t]*$|(?![\s\S]))/gm;

// Emphasis around the field name, with the colon inside it or outside - see
// the note in handoff's lib/handoff.js. `- **Status:** verified` parsed as a
// field that was present and empty, so a closed block drew a retrospective
// saying it had no Status.
const EM = '(?:\\*\\*|__|\\*|_)?';
const unemphasise = (s) => s.replace(/^(\*\*|__|\*|_)([\s\S]*)\1$/, '$2').trim();

function field(block, name) {
  const re = new RegExp('^[ 	]*[-*]?[ 	]*' + EM + name + EM + '[ 	]*:' + EM + '[ 	]*(.*)$', 'im');
  const m = block.match(re);
  if (!m) return null;
  const v = unemphasise(m[1].trim());
  // Treat placeholders left from the template as empty.
  if (!v || /^<.*>$/.test(v) || /^(n\/a|none|tbd|-|\?)$/i.test(v)) return '';
  return v;
}

/*
 * Remove what must not be judged: fenced code, inline code, quoted lines -
 * the same rule the termination, coverage and handoff scanners apply.
 *
 * Unlike those, this scanner has no prose-level hit detection: the block IS
 * the trigger, so the stripping has to happen before BLOCK_RE runs or a
 * message that *documents the format* is read as a real closure. That is not
 * hypothetical - it is what a message explaining the skill looks like, and
 * under EPIMON_STRICT it blocked the stop.
 *
 * BLOCK_RE is line-anchored (^...$ with /m), so fenced content is blanked
 * character by character with the newlines kept, rather than collapsed to a
 * space: the lines survive, the markers on them do not.
 */
function prose(text) {
  return text
    .replace(/```[\s\S]*?```/g, (fence) => fence.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, ' ')
    .split(/\r?\n/).map((l) => (/^\s*>/.test(l) ? '' : l)).join('\n');
}

function scan(text) {
  const out = { blocks: 0, violations: [], tags: { observed: 0, conjecture: 0, verified: 0 } };
  if (typeof text !== 'string' || !text) return out;

  const body0 = prose(text);

  out.tags.observed = (body0.match(/\[observed\]/gi) || []).length;
  out.tags.conjecture = (body0.match(/\[conjecture\]/gi) || []).length;
  out.tags.verified = (body0.match(/\[verified\b[^\]]*\]/gi) || []).length;

  let m;
  while ((m = BLOCK_RE.exec(body0)) !== null) {
    out.blocks += 1;
    const body = m[1];
    const claim = field(body, 'Claim') || '(unnamed claim)';
    const status = (field(body, 'Status') || '').toLowerCase();
    const falsifier = field(body, 'Falsifier');
    const verifiedBy = field(body, 'Verified by');
    const scope = field(body, 'Scope');

    if (!status) out.violations.push(`"${claim}": no Status (observed | conjecture | verified)`);
    else if (status.startsWith('conjecture') && !falsifier) out.violations.push(`"${claim}": Status is conjecture but no Falsifier is named`);
    else if (status.startsWith('verified') && !verifiedBy) out.violations.push(`"${claim}": Status is verified but "Verified by" is empty - what was run, and what did it look at?`);
    if (!scope) out.violations.push(`"${claim}": no Scope (what it covers, what it does not)`);
  }
  return out;
}

module.exports = { scan };
