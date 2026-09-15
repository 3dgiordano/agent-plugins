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

const BLOCK_RE = /\[EPISTEMIC CLOSE\]([\s\S]*?)(?=\n\s*\n|\[EPISTEMIC CLOSE\]|$)/g;

function field(block, name) {
  const re = new RegExp('^[ 	]*[-*]?[ 	]*' + name + '[ 	]*:[ 	]*(.*)$', 'im');
  const m = block.match(re);
  if (!m) return null;
  const v = m[1].trim();
  // Treat placeholders left from the template as empty.
  if (!v || /^<.*>$/.test(v) || /^(n\/a|none|tbd|-|\?)$/i.test(v)) return '';
  return v;
}

function scan(text) {
  const out = { blocks: 0, violations: [], tags: { observed: 0, conjecture: 0, verified: 0 } };
  if (typeof text !== 'string' || !text) return out;

  out.tags.observed = (text.match(/\[observed\]/gi) || []).length;
  out.tags.conjecture = (text.match(/\[conjecture\]/gi) || []).length;
  out.tags.verified = (text.match(/\[verified\b[^\]]*\]/gi) || []).length;

  let m;
  while ((m = BLOCK_RE.exec(text)) !== null) {
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
