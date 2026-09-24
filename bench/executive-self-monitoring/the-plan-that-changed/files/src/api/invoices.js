'use strict';
const { getJSON } = require('../net');

// Loads the invoices resource for the dashboard.
function loadInvoices(id, cb) {
  getJSON('https://api.internal/invoices/' + id, cb);
}

module.exports = { loadInvoices };
