'use strict';

/**
 * archiveProject
 * @param {object} body
 * @param {number} body.id
 * @param {boolean} body.archived
 */
function archiveProject(body) {
  return { status: 200, ok: 'archiveProject' };
}

module.exports = { archiveProject };
