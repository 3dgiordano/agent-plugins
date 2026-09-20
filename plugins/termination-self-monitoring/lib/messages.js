'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'termination-self-monitoring';

// A pointer, not a paraphrase - see the note in coverage's messages.js.
const LOAD =
  `[termination self-monitoring] You have no fatigue, no clock and no context budget to manage - the ` +
  'harness handles context. If you are about to stop, defer or narrow on a feeling or a limit you do ' +
  'not manage (in English, "running out of context", "not confident enough"), load the ' +
  `${SKILL} skill if it is not already loaded: it carries the checkable reasons and the exact block ` +
  'format the hooks read. Not a blocker.';

function retrospective(violations) {
  return '[termination self-monitoring] Your previous turn ended on a state-shaped reason: ' +
    violations.join('; ') + '. If the work is unfinished, either write the [TERMINATION CHECK] as a ' +
    'markdown list, not a fenced code block, with the checkable reason and its evidence, or pick the work back up now.';
}

function blockReason(violations) {
  return 'Termination gate: ' + violations.join('; ') + '. Add a [TERMINATION CHECK] markdown list, not a ' +
    'fenced code block (Trigger, Reason: gate-not-run | owner-choice | budget-spent | limit-observed | none, ' +
    'Evidence, Decision) - or, if no checkable reason holds, continue the work instead of stopping. Then finish.';
}

module.exports = { LOAD, retrospective, blockReason };
