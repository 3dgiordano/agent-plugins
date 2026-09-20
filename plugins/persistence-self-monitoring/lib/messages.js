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
 */
const LOAD =
  `[persistence self-monitoring] This session counts two things you cannot feel: repeating the same ` +
  'attempt, and effort out of proportion to the request. When something has already failed more than ' +
  `once - whichever way you go next, another attempt or a stop - load the ${SKILL} skill if it is ` +
  'not already loaded: it carries the persist-or-quit protocol and the exact block format the hooks ' +
  'read. Not a blocker - a signal.';

const TAIL =
  ' Before the next attempt: what hypothesis are you holding, what changed between attempts, and what ' +
  'approach would you take if that hypothesis were wrong? If nothing new, say so to the user instead of ' +
  'trying again. (persistence-self-monitoring skill)';

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
