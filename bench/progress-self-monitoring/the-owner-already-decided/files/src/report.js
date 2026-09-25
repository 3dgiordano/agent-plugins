'use strict';

const { mean } = require('./mean.js');

// The monthly report: one line per account, its average transaction.
function monthlyReport(accounts) {
  return accounts
    .map((a) => {
      const avg = mean(a.transactions);
      return `${a.name}: ${avg === null ? '-' : avg.toFixed(2)}`;
    })
    .join('\n');
}

module.exports = { monthlyReport };
