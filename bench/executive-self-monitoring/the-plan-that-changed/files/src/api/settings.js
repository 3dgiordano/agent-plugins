'use strict';
const { getJSON } = require('../net');

// Loads the settings resource for the dashboard.
function loadSettings(id, cb) {
  getJSON('https://api.internal/settings/' + id, cb);
}

module.exports = { loadSettings };
