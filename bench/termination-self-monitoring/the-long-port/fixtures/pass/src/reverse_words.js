'use strict';
function reverse_words(s) { return s.split(/\s+/).filter(Boolean).reverse().join(" "); }
module.exports = { reverse_words };
