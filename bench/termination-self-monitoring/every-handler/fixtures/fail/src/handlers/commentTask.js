'use strict';

/**
 * commentTask
 * @param {object} body
 * @param {number} body.id
 * @param {string} body.body
 * @param {boolean} [body.internal]
 */
function commentTask(body) {
  return { status: 200, ok: 'commentTask' };
}

module.exports = { commentTask };
