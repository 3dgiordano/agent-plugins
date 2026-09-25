'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'coverage-self-monitoring';
const host = require('./host.js');

/*
 * A pointer, not a paraphrase.
 *
 * This used to restate the protocol - write the ledger, hardest first, close
 * each part - which made loading the skill look redundant while dropping the
 * one thing the hooks actually read: the `- <part>: done` line shape. An agent
 * that has the gist has no reason to fetch the detail, so it wrote the block
 * in whatever form came naturally and the scanner refused it.
 *
 * So: say what this session is doing (the skill cannot know that), name the
 * trigger, and point at the skill for the rest. "Load ... if it is not already
 * loaded" keeps a cadence injection from asking for the same load every time.
 */
/*
 * The field names are here, not only in the skill. Measured on executive with
 * the Skill tool's own PreToolUse hook logging every invocation: the skill
 * loaded 0 times in 28 runs under `claude -p` - announced, permitted, and with
 * a description written to match the situation - while naming the block's
 * fields in the message took it from 0 of 6 to 6 of 6. The skill still carries
 * the full protocol for a host that runs no hook; Cursor -p runs this one only
 * when it was not started from Git Bash (see scripts/cursor-eval.js).
 *
 * "A fallback or invented data" is here because measured: with no key and no
 * network for a rates service, Composer 2.5 and both Groks shipped a fallback
 * (a mock server, a public API, a rate table) and reported the part done.
 */
const LOAD =
  `[coverage self-monitoring] This session tracks whether you deliver every part of the request, ` +
  'the hard one included: a stub, a fallback or invented data, a postponed or excluded part is a part ' +
  'that is not done, in any language. For a multi-part task write the [COVERAGE LEDGER] first - the ' +
  'parts, which is hardest, the order - and close each one in a [COVERAGE CHECK]: done | blocked | ' +
  `returned. Load the ${SKILL} skill if it is not already loaded for the rules. Markers, field names and status words stay in English, whatever language you write in. Not a blocker.`;

const PROTOCOL = `Load the ${SKILL} skill if it is not already loaded ("Core Protocol").`;

/*
 * This block is the odd one in the collection: its list items are the parts of
 * the request, named by the request, so there are no fixed field labels for a
 * message's prose to overwrite. That is why coverage was untouched by the
 * decorated-field defect in 0.5.1, and why less is at stake here than in the
 * other four. What moves to the skill is the ordering rule and the closing
 * vocabulary; what stays is the two markers and the one thing the skill cannot
 * know, which is how many parts were counted.
 */
function ledger(parts) {
  return `[coverage self-monitoring] the request enumerates ${parts} parts. Before starting: write the ` +
    '[COVERAGE LEDGER] as a markdown list, not a fenced code block - the parts, which is hardest, the ' +
    `order. At the end close every part in a [COVERAGE CHECK]: done | blocked | returned. ${PROTOCOL}`;
}

function nudge(signals) {
  const lines = signals.map((s) => {
    switch (s.kind) {
      case 'stubs': {
        const files = s.files.length ? ` (${s.files.slice(0, 4).join(', ')}${s.files.length > 4 ? ', ...' : ''})` : '';
        return `you have written ${s.count} stub / placeholder / TODO markers this turn${files}. Each one is a ` +
          'part of the request that is not done: implement it now, or close it in the [COVERAGE CHECK] as ' +
          'blocked or returned, with the reason';
      }
      default: return '';
    }
  }).filter(Boolean);
  return '[coverage self-monitoring] ' + lines.join('; ') + `. ${PROTOCOL}`;
}

/*
 * The scan reads words, not what a sentence does with them: an option offered
 * to the owner ("empezar por el esqueleto") and "lo que queda" of a mechanism
 * both read as deferred work (measured 2026-09-25, three of four findings in
 * one session). So the reminder says what it read and where, admits it can be
 * wrong, and gives the answer for that case - one line, which also keeps the
 * phrase from being raised again this session (hooks/cov-stop.js).
 */
function retrospective(violations, found) {
  const where = (found || []).filter((f) => f && f.context).slice(0, 4)
    .map((f) => `"${f.phrase}" in "${f.context}"`);
  return '[coverage self-monitoring] Your previous turn may have deferred work without closing the ledger: ' +
    violations.join('; ') + '.' + (where.length ? ` Where it was read: ${where.join('; ')}.` : '') +
    ' Close each deferred part in a [COVERAGE CHECK] - done, blocked, or returned, with the reason - ' +
    'and do the ones that are none of those. The reading can be wrong: if a phrase is not deferred ' +
    'work - an option you offered, a quote, another sense of the word - say so on its own line, ' +
    `\`- "<phrase>": misread - <what it was>\`. ${PROTOCOL}`;
}

// The one line the user sees when the stop scan finds something (lib/host.js):
// the finding, without the instruction written for the agent.
function notice(violations) {
  return host.notice('coverage self-monitoring', violations, 'the agent is reminded on your next message');
}
// A dispute silences a phrase for the session, so the person sees each one.
function disputeNotice(disputes) {
  return host.notice('coverage self-monitoring',
    disputes.map((d) => `the agent answered "${d.phrase}" as a misreading: ${d.reason.replace(/"/g, "'").replace(/\s+-\s+/g, ', ')}`),
    'not raised again this session');
}
function stubNotice(signals) {
  const s = signals.find((x) => x.kind === 'stubs');
  return host.notice('coverage self-monitoring', [`${s.count} stub / placeholder / TODO markers written this turn`],
    'the agent is asked to implement them or close them in a [COVERAGE CHECK]');
}

module.exports = { LOAD, ledger, nudge, retrospective, notice, disputeNotice, stubNotice };
