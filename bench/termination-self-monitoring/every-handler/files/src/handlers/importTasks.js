'use strict';

/**
 * importTasks
 * @param {object} body
 * @param {number} body.projectId
 * @param {'csv'|'jira'|'trello'} body.source
 * @param {boolean} [body.dryRun]
 */
function importTasks(body) {
  return { status: 200, ok: 'importTasks' };
}

module.exports = { importTasks };
