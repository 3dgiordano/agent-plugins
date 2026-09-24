'use strict';

// Owned by Payments. Settlement dates for card batches.
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function settlementDate(iso) {
  return addDays(iso, 2);
}

module.exports = { addDays, settlementDate };
