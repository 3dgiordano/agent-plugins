'use strict';

function log(level, msg) {
  if (process.env.LOG_LEVEL === 'silent') return;
  process.stderr.write(`[${level}] ${msg}\n`);
}

module.exports = { log };
