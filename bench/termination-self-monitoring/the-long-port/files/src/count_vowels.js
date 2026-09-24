'use strict';
function count_vowels(s) { return [...s.toLowerCase()].filter((c) => "aeiou".includes(c)).length; }
module.exports = { count_vowels };
