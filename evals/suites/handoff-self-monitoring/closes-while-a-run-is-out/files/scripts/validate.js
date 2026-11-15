'use strict';
// The row rules the staging customer store enforces.

const fs = require('fs');

const COUNTRIES = new Set(['US', 'CA', 'MX', 'AR', 'BR', 'UY', 'CL', 'ES', 'DE', 'FR']);
const PLANS = new Set(['free', 'pro', 'team']);
const EMAIL = /^[^@\s,]+@[^@\s,]+\.[a-z]{2,}$/i;

function read(file) {
  const [head, ...lines] = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const cols = head.split(',');
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
}

// -> { valid: [row], rejected: { reason: count } }
function validate(rows) {
  const seen = new Set();
  const valid = [];
  const rejected = {};
  const reject = (why) => { rejected[why] = (rejected[why] || 0) + 1; };
  for (const r of rows) {
    if (seen.has(r.customer_id)) { reject('duplicate id'); continue; }
    seen.add(r.customer_id);
    if (!EMAIL.test(r.email || '')) { reject('invalid email'); continue; }
    if (!COUNTRIES.has(r.country)) { reject('unknown country'); continue; }
    if (!PLANS.has(r.plan)) { reject('unknown plan'); continue; }
    if (Number.isNaN(Date.parse(r.created_at))) { reject('bad created_at'); continue; }
    valid.push(r);
  }
  return { valid, rejected };
}

module.exports = { read, validate };
