'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'coverage-self-monitoring';

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
const LOAD =
  `[coverage self-monitoring] This session tracks whether you deliver every part of the request, ` +
  'including the hard one: a hole in the delivery - a stub, a postponed or excluded part - is a part ' +
  `that is not done, in any language. For a multi-part task, load the ${SKILL} skill if it is not ` +
  'already loaded: it carries the ledger and the exact block format the hooks read. Not a blocker.';

function ledger(parts) {
  return `[coverage self-monitoring] the request enumerates ${parts} parts. Before starting: write the ` +
    '[COVERAGE LEDGER] as a markdown list, not a fenced code block - each part, which one is hardest and why, and the order you will take them in ' +
    '(hardest first unless a dependency forbids). At the end, close every part in a [COVERAGE CHECK] ' +
    'the same way. ' +
    `(${SKILL} skill)`;
}

function nudge(signals) {
  const lines = signals.map((s) => {
    switch (s.kind) {
      case 'stubs': {
        const files = s.files.length ? ` (${s.files.slice(0, 4).join(', ')}${s.files.length > 4 ? ', ...' : ''})` : '';
        return `you have written ${s.count} stub / placeholder / TODO markers this turn${files}. Each one is a ` +
          'part of the request that is not done: implement it now, or list it in the [COVERAGE CHECK] as ' +
          'blocked with the observed reason or returned to the owner';
      }
      default: return '';
    }
  }).filter(Boolean);
  return '[coverage self-monitoring] ' + lines.join('; ') + `. (${SKILL} skill)`;
}

function retrospective(violations) {
  return '[coverage self-monitoring] Your previous turn deferred work without closing the ledger: ' +
    violations.join('; ') + '. For each deferred part, say which it is - done now, blocked (the observed ' +
    'limit), or returned to the owner (the choice they must make) - and do the ones that are none of those.';
}

module.exports = { LOAD, ledger, nudge, retrospective };
