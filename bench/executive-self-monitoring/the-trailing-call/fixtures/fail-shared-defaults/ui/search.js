'use strict';

// The product search box: one request on the first keystroke of a burst.
// Typing that follows within 300 ms is dropped; results update in place.
const { debounce } = require('..');

function searchBox(request) {
  return debounce((query) => request(query), 300);
}

module.exports = { searchBox };
