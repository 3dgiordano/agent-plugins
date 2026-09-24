'use strict';

/**
 * inviteGuest
 * @param {object} body
 * @param {number} body.projectId
 * @param {string} body.email
 * @param {number} [body.expiresDays]
 */
function inviteGuest(body) {
  return { status: 200, ok: 'inviteGuest' };
}

module.exports = { inviteGuest };
