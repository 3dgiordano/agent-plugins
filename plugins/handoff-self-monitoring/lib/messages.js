'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'handoff-self-monitoring';

// A pointer, not a paraphrase - see the note in coverage's messages.js.
/*
 * Three triggers have missed here, and the third one is what explains the
 * other two: this message is injected at UserPromptSubmit, so a trigger the
 * agent cannot evaluate until the answer is written cannot fire.
 *
 * "Before you close a turn" and then "when your close would leave them a
 * choice" both failed, and "when your close carries a decision" scored 1 of 4 -
 * the runs read well, recommended a transport, one even ended on a question,
 * and none wrote the block. All three ask about the close, which does not
 * exist yet at the moment the message arrives.
 *
 * The four triggers in this collection that hold at 2-of-3 or better are all
 * decidable from the prompt as it lands: a multi-part task, a diagnosis, an
 * attempt that already failed, an instruction to stop. So this one is too -
 * the shape of the ASK, not the shape of the answer.
 *
 * Which means the first diagnosis in this comment ("always true, so it singles
 * out nothing") is no longer the best explanation of the original failure, and
 * is kept here only because it was measured alongside the rest.
 */
const LOAD =
  `[handoff self-monitoring] The reader of your final message has the message, not your trace. When the ` +
  'ask is one they will act on rather than just read - which of these, is this ready, look at this ' +
  `before I run it, what should we do - load the ${SKILL} skill if it is not already loaded: it carries ` +
  'the handoff protocol and the exact block format the hooks read. Not a blocker.';

function preclose(signal) {
  const seen = signal.what === 'commit' ? `\`${signal.label}\` ran` : `\`${signal.label}\` passed`;
  return `[handoff self-monitoring] ${seen} - this turn looks close to its end. When you write the final ` +
    'message, if the close is an offer, a fork, a question to the reader, or the turn is simply ending: ' +
    'Status first (done | needs-decision | blocked), the situation in the reader\'s terms, any fork as a ' +
    'list of options with Default on its own line, and one Next action - in a [HANDOFF] markdown list, ' +
    `not a fenced code block, with the trace detail below it. (${SKILL} skill)`;
}

function retrospective(violations) {
  return '[handoff self-monitoring] Your previous close left the reader without a handoff: ' +
    violations.join('; ') + '. Unless the owner\'s message already settles it, open this turn with the ' +
    '[HANDOFF] markdown list for where the work stood - Status, Situation in the reader\'s terms, Options ' +
    'as a list with Default on its own line, Next as one action; not a fenced code block - then continue.';
}

function blockReason(violations) {
  return 'Handoff gate: ' + violations.join('; ') + '. Add a [HANDOFF] markdown list, not a fenced code ' +
    'block (Status: done | needs-decision | blocked; Situation in the reader\'s terms; Options as a list ' +
    'with Default on its own line when the status is needs-decision; Blocked-by when blocked; Next: one ' +
    'action, or nothing) and keep paths, identifiers and what you ran below it. Then finish.';
}

module.exports = { LOAD, preclose, retrospective, blockReason };
