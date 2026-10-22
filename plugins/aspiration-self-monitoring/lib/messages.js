'use strict';
/* Reminder texts shared by the Claude Code and Cursor adapters. */

const SKILL = 'aspiration-self-monitoring';
const host = require('./host.js');

const FIELDS = 'Criterion, Reviewed, Found, Remainder (meets | defect | unverified | blocked)';
const PROTOCOL = `If you do not know what these markers ask for, load the ${SKILL} skill ("Core Protocol").`;

const LOAD =
  '[aspiration self-monitoring] When this turn makes or changes something - a file, a document, an image, code - review it after your last change the way it will be used, and hold it against the objective, not the letter. ' +
  `Close with the [ASPIRATION CHECK] markdown list: ${FIELDS}. A reply that only answers a question takes none. ` +
  `If you do not know what these markers ask for, load the ${SKILL} skill. ` +
  'Markers, field names and status words stay in English, whatever language you write in.';

function retrospective(violations) {
  return '[aspiration self-monitoring] Your previous turn closed on a result it called good enough: ' +
    violations.join('; ') + '. Review the result the way it will be used, then write the [ASPIRATION CHECK] as a markdown list - ' +
    `${FIELDS}. Stop when the review finds the criterion met, or say what blocks the review. ${PROTOCOL}`;
}

function blockReason(violations) {
  return 'Aspiration gate: ' + violations.join('; ') + '. Review the result the way it will be used, then add an [ASPIRATION CHECK] markdown list, not a ' +
    `fenced code block: ${FIELDS}. ${PROTOCOL}`;
}

function notice(violations) {
  return host.notice('aspiration self-monitoring', violations, 'the agent is reminded on your next message');
}

module.exports = { LOAD, retrospective, blockReason, notice };
