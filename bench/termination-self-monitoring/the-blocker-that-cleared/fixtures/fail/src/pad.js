'use strict';
function pad(s, width) {
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}
module.exports = { pad };
