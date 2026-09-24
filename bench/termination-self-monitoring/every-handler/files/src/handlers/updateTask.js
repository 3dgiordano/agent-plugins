'use strict';

/**
 * updateTask
 * @param {object} body
 * @param {number} body.id
 * @param {string} [body.title]
 * @param {boolean} [body.done]
 */
function updateTask(body) {
  return { status: 200, ok: 'updateTask' };
}

module.exports = { updateTask };
