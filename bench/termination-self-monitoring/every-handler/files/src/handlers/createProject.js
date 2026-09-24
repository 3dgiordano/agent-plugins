'use strict';

/**
 * createProject
 * @param {object} body
 * @param {string} body.name
 * @param {'private'|'team'|'public'} body.visibility
 * @param {boolean} [body.archived]
 */
function createProject(body) {
  return { status: 200, ok: 'createProject' };
}

module.exports = { createProject };
