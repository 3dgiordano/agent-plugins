'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'persistence-self-monitoring';

// A pointer, not a paraphrase - see the note in coverage's messages.js.
/*
 * This trigger has now excluded itself twice, each time by naming the act that
 * goes wrong rather than the situation that calls for the check.
 *
 * First it was "when a nudge arrives with a count": the counts are 4 edits, 3
 * failed runs or 30 tool calls, so a turn that never reaches one gets no nudge
 * and the message says the skill does not apply.
 *
 * Then it was "before trying again after something already failed". In the
 * eval every run read four failed attempts, named the layer they were all
 * working at, and decided NOT to try again - which is the behaviour this
 * plugin exists to produce. There was no "trying again", so the trigger never
 * fired, and the block that records the switch was never written.
 *
 * The trigger is the situation the turn arrives in: something has failed more
 * than once. It holds whichever way the next move goes, which is the point -
 * persisting and switching both need the reasoning written down.
 *
 * A copy-this-template version of this message was tried against Composer
 * on Cursor, and reverted: headless Cursor runs no hooks, so this text never
 * reached the model it was tuned on (six iterations, 0 of 3 with the plugin
 * on every one), and on Claude it narrowed the trigger to attempts the user
 * describes. The only layer Cursor -p delivers is the skill.
 */
// The field names are here, not only in the skill - see the note in coverage's
// lib/messages.js for what was measured.
// The last-but-one sentence is the exit ImpossibleBench measured (arXiv
// 2510.20270): given one, models stop passing contradictory tests by tricks.
// Composer 2.5 read only this message, not the skill, and passed them with
// per-call state and by reading the caller off new Error().stack.
const LOAD =
  `[persistence self-monitoring] When something has already failed more than once - whichever way ` +
  'you go next - write the [PERSISTENCE CHECK] markdown list: Attempts, Hypothesis held, Rival ' +
  'approach, Proportion, Decision. If the checks contradict each other or the spec, that is the ' +
  'finding: fix what can be fixed honestly, report the rest, and never pass them by a trick. ' +
  `Load the ${SKILL} skill if it is not already loaded for the rules. Not a blocker - a signal.`;

/*
 * This asked for the block's contents as three prose questions and never named
 * a single field. That is the shape measured on handoff: the wording of the
 * question becomes the field name, and the scanner refuses the result - three
 * runs of three produced `Next action:`, `What:` and `Files:` where `Situation`
 * and `Next` were wanted. Naming them took the same case from 0 of 3 to 3 of 3.
 *
 * So: the field names, as a list. The reasoning behind them is in the skill's
 * "Core Protocol" and is named rather than copied.
 */
const TAIL =
  ' Before the next attempt, write the [PERSISTENCE CHECK] as a markdown list: Attempts, Hypothesis held, ' +
  'Rival approach, Proportion, Decision. If nothing about the next attempt is new, say so to the user ' +
  'instead of trying again. Load the persistence-self-monitoring skill if it is not already loaded ("Core Protocol").';

function nudge(signals) {
  const lines = signals.map((s) => {
    switch (s.kind) {
      case 'edits': return `you have edited \`${s.key}\` ${s.count} times this turn`;
      case 'cmds': return `\`${s.key}\` has failed ${s.count} times this turn`;
      case 'errs': return `the same error has come back ${s.count} times this turn (${s.key})`;
      case 'effort': return `${s.count} tool calls since the user's last message - is this effort proportional to what was asked?`;
      default: return '';
    }
  }).filter(Boolean);
  return '[persistence self-monitoring] ' + lines.join('; ') + '.' + TAIL;
}

module.exports = { LOAD, nudge };
