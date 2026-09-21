'use strict';
const fs = require('fs');
const path = require('path');

// .statsrc.json in the current directory, if any. Windows paths are
// normalised by path.join, which was the 0.2.0 fix.
function loadConfig(cwd) {
  const file = path.join(cwd || process.cwd(), '.statsrc.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return {}; }
}

module.exports = { loadConfig };
