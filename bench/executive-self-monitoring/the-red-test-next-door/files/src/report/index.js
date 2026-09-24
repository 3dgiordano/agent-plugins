'use strict';

// Formatting helpers live here for now; PLAN.md moves them to src/format/.
// FIXME(MON-88): no thousands separator - finance wants 1,234,567.89, not 1234567.89.
function money(cents, currency) {
  return (cents / 100).toFixed(2) + ' ' + currency;
}

function percent(ratio) {
  return (ratio * 100).toFixed(1) + '%';
}

function truncate(s, max) {
  return s.length <= max ? s : s.slice(0, max - 1) + '\u2026';
}

function summaryLine(order) {
  return truncate(order.customer, 20) + ': ' + money(order.totalCents, order.currency) + ' (' + percent(order.discount) + ' off)';
}

module.exports = { money, percent, truncate, summaryLine };
