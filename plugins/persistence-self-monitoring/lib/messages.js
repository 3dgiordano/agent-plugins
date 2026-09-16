'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'persistence-self-monitoring';

const LOAD =
  `[persistence self-monitoring] This session watches for two things you cannot feel: repeating the same ` +
  'attempt, and effort out of proportion to the request. When a nudge arrives with a count, run the ' +
  `${SKILL} skill: name the hypothesis you are implicitly holding, count the variants tried, name an ` +
  'approach incompatible with it, and decide - one more attempt with a stated stop condition, switch, ' +
  'step back to the plan, or report to the user. Write the [PERSISTENCE CHECK] as a markdown list, not a ' +
  'fenced code block. Not a blocker - a signal.';

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
