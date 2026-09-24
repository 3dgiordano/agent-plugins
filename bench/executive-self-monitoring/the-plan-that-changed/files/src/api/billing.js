'use strict';
const { getJSON } = require('../net');

// Loads the billing resource for the dashboard.
function loadBilling(id, cb) {
  getJSON('https://api.internal/billing/' + id, cb);
}

module.exports = { loadBilling };
