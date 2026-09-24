'use strict';

// docs/pricing.md
function formatPrice(amount) {
  const cents = Math.round(amount * 100);
  const whole = Math.trunc(cents / 100);
  const frac = String(Math.abs(cents % 100)).padStart(2, '0');
  return '$' + whole.toLocaleString('en-US') + '.' + frac;
}

module.exports = { formatPrice };
