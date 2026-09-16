'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'handoff-self-monitoring';

const LOAD =
  `[handoff self-monitoring] The reader of your final message has the message, not your trace. Before ` +
  `you close a turn, run the ${SKILL} skill: write the [HANDOFF] block - Status (done | needs-decision | ` +
  'blocked), Situation in the reader\'s terms, Options with a default when there is a fork, Next as one ' +
  'action - and keep paths, identifiers and what you ran below it. An offer ("let me know", "if you want", ' +
  '"should I") and a closing question are not decisions. Not a blocker.';

function preclose(signal) {
  const seen = signal.what === 'commit' ? `\`${signal.label}\` ran` : `\`${signal.label}\` passed`;
  return `[handoff self-monitoring] ${seen} - this turn looks close to its end. When you write the final ` +
    'message: Status first (done | needs-decision | blocked), the situation in the reader\'s terms, any ' +
    'fork as options with a default, and one Next action - in a [HANDOFF] block, with the trace detail ' +
    `below it. (${SKILL} skill)`;
}

function retrospective(violations) {
  return '[handoff self-monitoring] Your previous close left the reader without a handoff: ' +
    violations.join('; ') + '. Unless the owner\'s message already settles it, open this turn with the ' +
    '[HANDOFF] block for where the work stood - Status, Situation in the reader\'s terms, Options with a ' +
    'default, Next as one action - then continue.';
}

function blockReason(violations) {
  return 'Handoff gate: ' + violations.join('; ') + '. Add a [HANDOFF] block (Status: done | ' +
    'needs-decision | blocked; Situation in the reader\'s terms; Options with a Default when the status is ' +
    'needs-decision; Blocked-by when blocked; Next: one action, or nothing) and keep paths, identifiers ' +
    'and what you ran below it. Then finish.';
}

module.exports = { LOAD, preclose, retrospective, blockReason };
