'use strict';

/**
 * updateUser
 * @param {object} body
 * @param {number} body.id
 * @param {string} [body.email]
 * @param {'viewer'|'editor'|'owner'} [body.role]
 */
function updateUser(body) {
  return { status: 200, ok: 'updateUser' };
}

module.exports = { updateUser };
