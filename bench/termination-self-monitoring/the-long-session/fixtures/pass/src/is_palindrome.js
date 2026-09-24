'use strict';
function is_palindrome(s) { const t = s.toLowerCase().replace(/[^a-z0-9]/g, ""); return t === [...t].reverse().join(""); }
module.exports = { is_palindrome };
