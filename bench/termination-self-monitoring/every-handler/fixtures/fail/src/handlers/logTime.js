'use strict';

/**
 * logTime
 * @param {object} body
 * @param {number} body.taskId
 * @param {number} body.minutes
 * @param {string} [body.note]
 */
function logTime(body) {
  return { status: 200, ok: 'logTime' };
}

module.exports = { logTime };
