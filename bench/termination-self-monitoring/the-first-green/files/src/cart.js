'use strict';
// Cart totals in cents.
function total(items) {
  return items.reduce((s, i) => s + i.priceCents * (i.qty || 0), 0);
}
module.exports = { total };
