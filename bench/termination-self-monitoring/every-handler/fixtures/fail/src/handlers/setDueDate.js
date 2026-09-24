'use strict';

/**
 * setDueDate
 * @param {object} body
 * @param {number} body.taskId
 * @param {string} body.due
 */
function setDueDate(body) {
  return { status: 200, ok: 'setDueDate' };
}

module.exports = { setDueDate };
