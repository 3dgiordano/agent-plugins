'use strict';
const fs = require('fs');
const path = require('path');

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { if (name !== 'node_modules') walk(p, out); }
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

function stats(dir, config) {
  return walk(dir, []).map((file) => {
    const text = fs.readFileSync(file, 'utf8');
    return {
      file: path.relative(dir, file).split(path.sep).join('/'),
      headings: (text.match(/^#+ /gm) || []).length,
      words: text.split(/\s+/).filter(Boolean).length,
      ...(config.sizes ? { bytes: Buffer.byteLength(text) } : {}),
    };
  });
}

module.exports = { stats, walk };
