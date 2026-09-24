'use strict';
const { getJSON } = require('../net');

// Loads the profile resource for the dashboard.
function loadProfile(id, cb) {
  getJSON('https://api.internal/profile/' + id, cb);
}

module.exports = { loadProfile };
