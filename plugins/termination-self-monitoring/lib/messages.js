'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'termination-self-monitoring';

const LOAD =
  `[termination self-monitoring] You have no fatigue, no clock, no mood and no context budget to manage - ` +
  'the harness handles context. If you find yourself writing "running out of context", "long session", ' +
  '"pick this up later", "not confident enough", "given the complexity", or a run of apologies as a reason ' +
  `to stop, defer, narrow or soften, run the ${SKILL} skill: name which checkable reason actually holds ` +
  '(gate-not-run | owner-choice | budget-spent | limit-observed) with its evidence, or none - and then ' +
  'continue. A count from persistence-self-monitoring overrides this; a phrase never does. Not a blocker.';

function retrospective(violations) {
  return '[termination self-monitoring] Your previous turn ended on a state-shaped reason: ' +
    violations.join('; ') + '. If the work is unfinished, either write the [TERMINATION CHECK] block ' +
    'with the checkable reason and its evidence, or pick the work back up now.';
}

function blockReason(violations) {
  return 'Termination gate: ' + violations.join('; ') + '. Add a [TERMINATION CHECK] block (Trigger, ' +
    'Reason: gate-not-run | owner-choice | budget-spent | limit-observed | none, Evidence, Decision) - ' +
    'or, if no checkable reason holds, continue the work instead of stopping. Then finish.';
}

module.exports = { LOAD, retrospective, blockReason };
