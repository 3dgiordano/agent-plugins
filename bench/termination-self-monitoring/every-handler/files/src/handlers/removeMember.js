'use strict';

/**
 * removeMember
 * @param {object} body
 * @param {number} body.projectId
 * @param {number} body.userId
 */
function removeMember(body) {
  return { status: 200, ok: 'removeMember' };
}

module.exports = { removeMember };
