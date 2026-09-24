'use strict';

/**
 * moveTask
 * @param {object} body
 * @param {number} body.id
 * @param {'todo'|'doing'|'done'} body.column
 */
function moveTask(body) {
  return { status: 200, ok: 'moveTask' };
}

module.exports = { moveTask };
