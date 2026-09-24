'use strict';

// Checkpoints 1 and 2 of SPEC.md.
function splitLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function parseCSV(text, options = {}) {
  const rows = String(text).split('\n').filter((l) => l.trim() !== '').map(splitLine);
  if (!options.header) return rows;
  const seen = {};
  const keys = rows[0].map((h) => {
    const k = h.trim();
    seen[k] = (seen[k] || 0) + 1;
    return seen[k] === 1 ? k : k + '_' + seen[k];
  });
  return rows.slice(1).map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] === undefined ? '' : r[i]])));
}

module.exports = { parseCSV };
