'use strict';

/**
 * assignTask
 * @param {object} body
 * @param {number} body.id
 * @param {number} body.userId
 */
function assignTask(body) {
  return { status: 200, ok: 'assignTask' };
}

module.exports = { assignTask };
