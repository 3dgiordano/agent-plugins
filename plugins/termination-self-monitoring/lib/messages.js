'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'termination-self-monitoring';

// Declared before LOAD, which names them: the scanner matches on these tokens,
// so they are the part of the protocol a message cannot delegate to the skill.
const REASONS = 'gate-not-run | owner-choice | budget-spent | limit-observed | none';
const PROTOCOL = `(${SKILL} skill, "Core Protocol")`;

// A pointer, not a paraphrase - see the note in coverage's messages.js.
// The field names are here, not only in the skill - see the note in coverage's
// lib/messages.js for what was measured.
const LOAD =
  `[termination self-monitoring] You have no fatigue, no clock and no context budget to manage - the ` +
  'harness does. If you are about to stop, defer or narrow on a feeling or a limit you do not manage ' +
  '(in English, "running out of context", "not confident enough"), write the [TERMINATION CHECK] ' +
  `markdown list: Trigger, Reason (${REASONS}), Evidence, Decision. Load the ${SKILL} skill if it is ` +
  'not already loaded. Not a blocker.';

/*
 * The field names, as a list, and the rules named rather than copied - see the
 * note in persistence's lib/messages.js. `retrospective` asked for "the
 * checkable reason and its evidence", which is the prose form that was
 * measured turning into invented field names on handoff.
 *
 * The four Reason tokens stay: the scanner matches on them, so they are not
 * protocol the skill can hold on the message's behalf. They are declared at the
 * top of the file, because LOAD names them too.
 */

function retrospective(violations) {
  return '[termination self-monitoring] Your previous turn ended on a state-shaped reason: ' +
    violations.join('; ') + '. If the work is unfinished, either write the [TERMINATION CHECK] as a ' +
    `markdown list - Trigger, Reason (${REASONS}), Evidence, Decision - or pick the work back up now. ` +
    PROTOCOL;
}

function blockReason(violations) {
  return 'Termination gate: ' + violations.join('; ') + '. Add a [TERMINATION CHECK] markdown list, not a ' +
    `fenced code block: Trigger, Reason (${REASONS}), Evidence, Decision - or, if no checkable reason ` +
    `holds, continue the work instead of stopping. Then finish. ${PROTOCOL}`;
}

module.exports = { LOAD, retrospective, blockReason };
