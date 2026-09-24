'use strict';

/**
 * exportProject
 * @param {object} body
 * @param {number} body.id
 * @param {'csv'|'json'} body.format
 */
function exportProject(body) {
  return { status: 200, ok: 'exportProject' };
}

module.exports = { exportProject };
