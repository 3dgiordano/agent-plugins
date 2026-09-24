'use strict';

const cents = (n) => Math.round(n * 100);
const dollars = (c) => (c / 100).toFixed(2);

module.exports = { cents, dollars };
