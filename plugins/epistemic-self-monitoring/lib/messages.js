'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'epistemic-self-monitoring';

// A pointer, not a paraphrase - see the note in coverage's messages.js.
// The field names are here, not only in the skill - see the note in coverage's
// lib/messages.js for what was measured.
const LOAD =
  `[epistemic self-monitoring] This session keeps what you observed apart from what you concluded. ` +
  'Before a diagnosis, a root cause or a closure, write the [EPISTEMIC CLOSE] markdown list - Claim, ' +
  'Status (observed | conjecture | verified), Evidence, Falsifier, Verified by, Scope. Load the ' +
  `${SKILL} skill if it is not already loaded for the rules. Not a blocker - a way of writing.`;

const PROTOCOL = `Load the ${SKILL} skill if it is not already loaded ("Core Protocol").`;

/*
 * The most frequent message in the collection - every sixth shell command, and
 * on the first failure - so it is the one where length compounds.
 *
 * What it keeps is the question, because that is the whole of its value and it
 * has to arrive at the moment of the observation. What it drops is the list of
 * rival kinds, which the skill already enumerates under "Core Protocol" as
 * "the usual suspects". A message is not the place to carry a taxonomy that
 * something else holds in full.
 *
 * It names no fields because it asks for no block: the closure block has its
 * own message. This is the one message here that is a prompt to think rather
 * than an instruction to write.
 */
const OBSERVE =
  '[epistemic self-monitoring] You just received an observation. Did it match what you expected? If not, ' +
  `name the surprise and the strongest rival explanation before choosing one ${PROTOCOL}. What you saw ` +
  'is [observed]; what it means is [conjecture] until its falsifier ran.';

function retrospective(violations) {
  return '[epistemic self-monitoring] Your previous turn closed with unresolved epistemic gaps: ' +
    violations.join('; ') + '. Either supply the missing Falsifier, "Verified by" or Scope, or restate ' +
    `the claim as a conjecture. ${PROTOCOL}`;
}

function blockReason(violations) {
  return 'Epistemic closure gate: ' + violations.join('; ') + '. Fix the [EPISTEMIC CLOSE] markdown list, ' +
    'not a fenced code block: Claim, Status, Evidence, Falsifier, "Verified by" when the status is ' +
    `verified, Scope - or downgrade the claim to a conjecture. Then finish. ${PROTOCOL}`;
}

module.exports = { LOAD, OBSERVE, retrospective, blockReason };
