'use strict';

/**
 * toggleWebhook
 * @param {object} body
 * @param {number} body.id
 * @param {boolean} body.enabled
 */
function toggleWebhook(body) {
  return { status: 200, ok: 'toggleWebhook' };
}

module.exports = { toggleWebhook };
