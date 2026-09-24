'use strict';

/**
 * createLabel
 * @param {object} body
 * @param {number} body.projectId
 * @param {string} body.name
 * @param {string} [body.color]
 */
function createLabel(body) {
  return { status: 200, ok: 'createLabel' };
}

module.exports = { createLabel };
