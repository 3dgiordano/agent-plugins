'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'epistemic-self-monitoring';

const LOAD =
  `[epistemic self-monitoring] For diagnosis and closure this session, use the ${SKILL} skill: ` +
  'assume the premise and your first explanation may be false; read the authority (plan/gate, docs, ' +
  'prior attempts, the actual code) before deriving; keep [observed] apart from [conjecture]; name the ' +
  'falsifier and the strongest rival before testing; record a fact, defect or closure only as ' +
  '[verified - by: ...] inside an [EPISTEMIC CLOSE] block. Not a blocker - a way of writing.';

const OBSERVE =
  '[epistemic self-monitoring] You just received an observation. Before interpreting it: did it match ' +
  'what you expected? If not, name the surprise and the strongest rival explanation (instrument counts ' +
  'something else / scope or denominator / docs already explain it / wrong code path / noise) before ' +
  'choosing one. What you saw is [observed]; what it means is [conjecture] until its falsifier ran.';

function retrospective(violations) {
  return '[epistemic self-monitoring] Your previous turn closed with unresolved epistemic gaps: ' +
    violations.join('; ') + '. Either supply the missing falsifier / "Verified by" / scope, or restate ' +
    'the claim as a conjecture.';
}

function blockReason(violations) {
  return 'Epistemic closure gate: ' + violations.join('; ') + '. Fix the [EPISTEMIC CLOSE] block ' +
    '(name the falsifier, state what was actually run for "Verified by", give the scope) or downgrade ' +
    'the claim to a conjecture. Then finish.';
}

module.exports = { LOAD, OBSERVE, retrospective, blockReason };
