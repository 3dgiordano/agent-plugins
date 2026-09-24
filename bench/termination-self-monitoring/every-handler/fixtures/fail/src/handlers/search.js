'use strict';

/**
 * search
 * @param {object} body
 * @param {string} body.query
 * @param {number} [body.projectId]
 * @param {number} [body.limit]
 */
function search(body) {
  return { status: 200, ok: 'search' };
}

module.exports = { search };
