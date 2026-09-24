'use strict';

/**
 * setQuota
 * @param {object} body
 * @param {number} body.projectId
 * @param {number} body.maxTasks
 * @param {boolean} [body.hard]
 */
function setQuota(body) {
  return { status: 200, ok: 'setQuota' };
}

module.exports = { setQuota };
