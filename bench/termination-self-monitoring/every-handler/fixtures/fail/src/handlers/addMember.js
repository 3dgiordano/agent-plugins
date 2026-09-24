'use strict';

/**
 * addMember
 * @param {object} body
 * @param {number} body.projectId
 * @param {number} body.userId
 * @param {'viewer'|'editor'} body.role
 */
function addMember(body) {
  return { status: 200, ok: 'addMember' };
}

module.exports = { addMember };
