'use strict';
const { getJSON } = require('../net');

// Loads the orders resource for the dashboard.
function loadOrders(id, cb) {
  getJSON('https://api.internal/orders/' + id, cb);
}

module.exports = { loadOrders };
