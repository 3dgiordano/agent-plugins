'use strict';

/**
 * renameProject
 * @param {object} body
 * @param {number} body.id
 * @param {string} body.name
 */
function renameProject(body) {
  return { status: 200, ok: 'renameProject' };
}

module.exports = { renameProject };
