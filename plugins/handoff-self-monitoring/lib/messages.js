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
// The field names are here, not only in the skill - see the note in coverage's
// lib/messages.js for what was measured.
//
// Status carries its three values here for the same reason the field names are
// here at all: the scanner reads the VALUE against that set, so the set is
// scanner-read content, not protocol prose. The distinction matters because of
// the 0.5.0 result recorded below - restating the RULES in a message hurt,
// because it made loading the skill look redundant. Naming a field's domain is
// not restating a rule, and this was the measured defect: on a review turn the
// agent wrote `Reviewed; <finding>` in 6 of 6 runs, a well-formed block whose
// only violation was that word, while the skill named the three values and the
// message named only the field. If a later measurement shows the enum hurting
// LOAD the way the protocol did, take it out of LOAD first - the three below
// fire at the writing, LOAD fires far from it.
const LOAD =
  `[handoff self-monitoring] The reader of your final message has the message, not your trace. When the ` +
  'ask is one they will act on - which of these, is this ready, look at this before I run it - close ' +
  'with a [HANDOFF] markdown list: Status (done | needs-decision | blocked), Situation in the ' +
  'reader\'s terms, Options with Default on ' +
  `its own line, Next. Load the ${SKILL} skill if it is not already loaded for the rules. Not a blocker.`;

/*
 * These three used to restate the protocol they point at. What stays is what
 * the SCANNER reads - the marker and the field names - plus the one thing the
 * skill cannot know, which is what just happened. The rules behind the fields
 * are in the skill's "Core Protocol" and are named rather than copied.
 *
 * The split is deliberate rather than aesthetic. A skill load costs more than
 * every injected message in this collection put together (handoff's SKILL.md
 * is 9.5k characters against 6.2k for all eighteen messages), so a message
 * that drops the fields and points at the skill is only cheaper when the skill
 * was going to be loaded anyway. Keeping the field names means a turn that
 * needs nothing more than the shape does not have to pay for the load.
 *
 * Measured in 0.5.0 on the LOAD message, which is the opposite case: dropping
 * the protocol from it HELPED, because a message that restates the protocol
 * makes loading the skill look redundant. LOAD fires far from the writing; the
 * three below fire at it.
 */
const PROTOCOL = `Load the ${SKILL} skill if it is not already loaded ("Core Protocol").`;

function preclose(signal) {
  const seen = signal.what === 'commit' ? `\`${signal.label}\` ran` : `\`${signal.label}\` passed`;
  return `[handoff self-monitoring] ${seen} - this turn looks close to its end. Close with a [HANDOFF] ` +
    'markdown list, not a fenced code block: Status (done | needs-decision | blocked), Situation in ' +
    'the reader\'s terms, Options with ' +
    `Default on its own line, Next. Trace detail below it. ${PROTOCOL}`;
}

function retrospective(violations) {
  return '[handoff self-monitoring] Your previous close left the reader without a handoff: ' +
    violations.join('; ') + '. Unless the owner\'s message already settles it, open this turn with the ' +
    `[HANDOFF] block for where the work stood, then continue. ${PROTOCOL}`;
}

function blockReason(violations) {
  return 'Handoff gate: ' + violations.join('; ') + '. Add a [HANDOFF] markdown list, not a fenced code ' +
    // No enum here, unlike LOAD and preclose: this message carries the
    // violations, and a Status violation quotes the three values itself. Same
    // for retrospective. The enum belongs in the messages that fire BEFORE the
    // agent writes, not in the ones that fire after it got the word wrong.
    'block: Status, Situation, Options with Default when needs-decision, Blocked-by when blocked, Next. ' +
    `Keep paths, identifiers and what you ran below it. Then finish. ${PROTOCOL}`;
}

module.exports = { LOAD, preclose, retrospective, blockReason };
