'use strict';
const { getJSON } = require('../net');

// Loads the catalog resource for the dashboard.
function loadCatalog(id, cb) {
  getJSON('https://api.internal/catalog/' + id, cb);
}

module.exports = { loadCatalog };
