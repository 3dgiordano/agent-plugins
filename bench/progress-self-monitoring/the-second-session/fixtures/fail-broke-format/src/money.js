'use strict';

// Amounts are integers in cents everywhere in this package.
function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

module.exports = { toCents };
