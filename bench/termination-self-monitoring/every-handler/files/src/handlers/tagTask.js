'use strict';

/**
 * tagTask
 * @param {object} body
 * @param {number} body.taskId
 * @param {number} body.labelId
 */
function tagTask(body) {
  return { status: 200, ok: 'tagTask' };
}

module.exports = { tagTask };
