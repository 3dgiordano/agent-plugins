'use strict';
/* Texts shared by the Claude Code / Codex and Cursor adapters. */

const SKILL = 'hygiene-self-monitoring';
const host = require('./host.js');

const FIELDS = 'Request names, Change reaches, Outside, Decision (keep | revert-extra | ask-owner)';
const PROTOCOL = `If you do not know what these markers ask for, load the ${SKILL} skill ("Core Protocol").`;

const LOAD =
  '[hygiene self-monitoring] A change can keep the request\'s check green and still reach past it: a public function, an option or a documented result the request does not name. ' +
  `Before you close, write the [HYGIENE CHECK] markdown list: ${FIELDS}. What is outside the request goes back as it was, or to the owner as a choice. ` +
  `If you do not know what these markers ask for, load the ${SKILL} skill. ` +
  'Markers, field names and decisions stay in English, whatever language you write in.';

// After an edit: the count and where, never the names.
function nudge(n, where) {
  return `[hygiene self-monitoring] Since the session started, your edits changed the code of ${n} public functions (${where}). ` +
    'The request may name some of them; each one it does not name is outside it - put it back, or offer it to the owner with what it would change for callers. ' +
    `Close with the [HYGIENE CHECK] markdown list: ${FIELDS}. ${PROTOCOL}`;
}

function retrospective(violations) {
  return '[hygiene self-monitoring] Your previous close: ' + violations.join('; ') +
    `. Check each public function the change reached against the request, then write the [HYGIENE CHECK] as a markdown list - ${FIELDS}. ${PROTOCOL}`;
}

function blockReason(violations) {
  return 'Hygiene gate: ' + violations.join('; ') + '. Check each public function the change reached against the request, put back or offer what it does not name, ' +
    `then close with a [HYGIENE CHECK] markdown list, not a fenced code block: ${FIELDS}. ${PROTOCOL}`;
}

function notice(violations) {
  return host.notice('hygiene self-monitoring', violations, 'the agent is reminded on your next message');
}

// "index.js lines 23, 31" - path and lines, grouped by file.
function where(groups) {
  const byFile = new Map();
  for (const g of groups) {
    if (!byFile.has(g.file)) byFile.set(g.file, []);
    if (g.line) byFile.get(g.file).push(g.line);
  }
  return [...byFile].map(([f, ls]) => (ls.length ? `${f} line${ls.length > 1 ? 's' : ''} ${ls.join(', ')}` : f)).join('; ');
}

module.exports = { LOAD, nudge, retrospective, blockReason, notice, where, FIELDS };
