'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'coverage-self-monitoring';

const LOAD =
  `[coverage self-monitoring] This session tracks whether what you deliver covers every part of the ` +
  'request, including the hard one - the tractable subset comes out with the same fluency as the whole. ' +
  `For a multi-part task, run the ${SKILL} skill: write the ledger first (the parts, which is hardest and ` +
  'why, the order - hardest first unless a dependency forbids), and close each part as done, blocked with ' +
  'an observed reason, or returned to the owner - never silently dropped. A hole in the delivery ' +
  '(a stub, a postponed or excluded part) is a part that is not done, in any language. Stub and TODO ' +
  'markers you write are counted. Not a blocker.';

function ledger(parts) {
  return `[coverage self-monitoring] the request enumerates ${parts} parts. Before starting: write the ` +
    '[COVERAGE LEDGER] - each part, which one is hardest and why, and the order you will take them in ' +
    '(hardest first unless a dependency forbids). At the end, close every part in a [COVERAGE CHECK]. ' +
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
