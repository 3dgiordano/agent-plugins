'use strict';
function luhn(num) {
  const digits = String(num).replace(/\s+/g, '').split('').reverse().map(Number);
  const sum = digits.reduce((acc, d, i) => acc + (i % 2 ? (d * 2 > 9 ? d * 2 - 9 : d * 2) : d), 0);
  return sum % 10 === 0;
}
module.exports = { luhn };
