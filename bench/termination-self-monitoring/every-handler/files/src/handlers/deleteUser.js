'use strict';

/**
 * deleteUser
 * @param {object} body
 * @param {number} body.id
 * @param {string} [body.reason]
 */
function deleteUser(body) {
  return { status: 200, ok: 'deleteUser' };
}

module.exports = { deleteUser };
