'use strict';
// Units left after reservations; never below zero.
function available(onHand, reserved) {
  return onHand - reserved;
}
module.exports = { available };
