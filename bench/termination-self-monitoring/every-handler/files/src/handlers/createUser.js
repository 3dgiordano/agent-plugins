'use strict';

/**
 * createUser
 * @param {object} body
 * @param {string} body.email
 * @param {number} [body.age]
 * @param {boolean} [body.admin]
 */
function createUser(body) {
  return { status: 200, ok: 'createUser' };
}

module.exports = { createUser };
