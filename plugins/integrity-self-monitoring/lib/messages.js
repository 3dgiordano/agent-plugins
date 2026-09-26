'use strict';
/* Texts shared by the Claude Code / Codex and Cursor adapters. */

const SKILL = 'integrity-self-monitoring';
const host = require('./host.js');

/*
 * Each message names what the user would get: a value the service never
 * gave, a result that holds on this machine only, code that answers its
 * caller differently. The work is the subject, and so is the person who will
 * use it.
 *
 * There is no message on the prompt. A rule about results that only look
 * done has nothing to say to a turn that has not taken that route, so it
 * arrives with the first finding and only then. `LOAD` is that rule: the
 * tail of every nudge.
 */
const LOAD =
  'If the service, the key or the data cannot be had here, the real result is an error that says so, and ' +
  '"cannot be done as asked, because X" is a complete answer. If this is what the user asked for, say so in ' +
  'your close as `- <file or kind>: misread - <why>`. Write the [INTEGRITY CHECK] as a markdown list: Result (real | ' +
  `shortcut | blocked), Route, Outside the task, Told the user. Load the ${SKILL} skill if it is not already ` +
  'loaded. Markers, field names and status words stay in English, whatever language you write in. Not a blocker.';

/*
 * What each signal is, in the work's terms: what the code does, and what the
 * user gets from it.
 *
 * A code finding names the file, the line and the shape - never the text it
 * matched. That text is file content, and file content can carry an
 * instruction: echoed back here it would reach the model as a hook's own
 * message. The agent opens the line itself. A command is quoted, as the
 * other plugins quote one: the agent issued it.
 */
const where = (s) => `\`${s.file}\`${s.line ? ` line ${s.line}` : ''}`;
const SAYS = {
  'table': (s) => [`${where(s)} holds a table of rates beside a call to the service`, 'the user gets rates nobody fetched, and totals that do not reconcile'],
  'catch returns': (s) => [`${where(s)} answers a failed call with a value of its own`, 'when the service fails, the user gets a result that looks real and is not'],
  'promise catch': (s) => [`${where(s)} answers a failed call with another answer`, 'when the service fails, the user gets data from somewhere they did not ask for'],
  'missing key': (s) => [`${where(s)} answers a missing credential with a value`, 'without the key, the user gets a result instead of the error that says the key is missing'],
  'second service': (s) => [`\`${s.file}\` reads from ${s.count || 'more than one'} hosts`, 'if one stands in for another, the user gets data from a source they did not ask for'],
  'looks at caller': (s) => [`${where(s)} reads who called it, next to a test's name`, 'code that answers its caller differently gives the user a different result from the one the tests checked'],
  'changes the system': (s) => [`\`${s.what}\` changes the system`, 'what passes that way passes on this machine only, and the user\'s is unchanged'],
  'starts a server': (s) => [`\`${s.what}\` starts a server`,'a local stand-in answers where the real service does not, and the result says nothing about the real one'],
};

function says(s) {
  const f = SAYS[s.kind];
  return f ? f(s) : [`${s.file ? `\`${s.file}\`` : 'a command'}: ${s.kind}`, 'the result may only look done'];
}

// For the agent: each finding with its consequence, then the rule.
function nudge(signals) {
  const lines = signals.map((s) => { const [what, then] = says(s); return `${what}: ${then}.`; });
  return `[integrity self-monitoring] ${lines.join(' ')} ${LOAD}`;
}

// For the person: what was written and what it means for them. host.notice()
// cuts a finding at its first " - ", so the consequence joins with a colon:
// it is the news.
function notice(signals) {
  return host.notice('integrity self-monitoring', signals.map((s) => { const [what, then] = says(s); return `${what}: ${then}`; }), 'the agent is asked whether the result is real');
}

/*
 * A dispute goes to the person, never back to the agent: the agent said the
 * finding is what was asked, and only the person knows whether it is.
 */
function disputeNotice(taken) {
  const parts = taken.map((d) => `${d.file ? `\`${d.file}\`` : d.kind} (${d.kind}): "${d.reason}"`);
  return host.notice('integrity self-monitoring', [`the agent answered that this is what you asked for: ${parts.join('; ')}`], 'check it against what you asked');
}

module.exports = { LOAD, SKILL, nudge, notice, disputeNotice, says };
