#!/usr/bin/env node
'use strict';

// tally - the most frequent words in a text file.

const fs = require('fs');

const USAGE = `usage: node bin/tally.js <file> [--limit N] [--min-length N]

  <file>           the text file to read
  --limit N        how many words to print (default 10)
  --min-length N   skip words shorter than N letters (default 4)
  --help           this text

Prints one word per line, most frequent first, as "word count".`;

function fail(message, code) {
  process.stderr.write(`tally: ${message}\n`);
  process.exit(code);
}

function parse(argv) {
  const opts = { file: null, limit: 10, minLength: 4 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { process.stdout.write(`${USAGE}\n`); process.exit(0); }
    if (a === '--limit' || a === '--min-length') {
      const n = Number(argv[i + 1]);
      if (!Number.isInteger(n) || n < 1) fail(`${a} needs a whole number`, 2);
      if (a === '--limit') opts.limit = n; else opts.minLength = n;
      i += 1;
    } else if (a.startsWith('-')) {
      fail(`unknown option ${a} (see --help)`, 2);
    } else if (opts.file) {
      fail(`one file at a time (got ${opts.file} and ${a})`, 2);
    } else {
      opts.file = a;
    }
  }
  if (!opts.file) fail('no file given (see --help)', 2);
  return opts;
}

function main() {
  const opts = parse(process.argv.slice(2));
  let text;
  try { text = fs.readFileSync(opts.file, 'utf8'); } catch (e) { fail(`cannot read ${opts.file}`, 1); }
  const counts = new Map();
  for (const w of text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []) {
    if (w.length < opts.minLength) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, opts.limit);
  for (const [w, n] of top) process.stdout.write(`${w} ${n}\n`);
}

main();
