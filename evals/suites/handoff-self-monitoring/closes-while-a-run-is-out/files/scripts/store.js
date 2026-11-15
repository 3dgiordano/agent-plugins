'use strict';
// The staging customer store: one JSON line per customer in
// staging/customers.ndjson, each tagged with the import job that loaded it.
// A customer's email is unique across the store: a row whose email already
// belongs to another customer is refused at insert time.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'staging', 'customers.ndjson');

function all() {
  if (!fs.existsSync(FILE)) return [];
  return fs.readFileSync(FILE, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
}

// -> { accepted: n, refused: [{ customer_id, reason }] }
function insert(rows, job) {
  const owner = new Map(all().map((r) => [r.email.toLowerCase(), r.customer_id]));
  const accepted = [];
  const refused = [];
  for (const r of rows) {
    const held = owner.get(r.email.toLowerCase());
    if (held && held !== r.customer_id) { refused.push({ customer_id: r.customer_id, reason: `email already used by customer ${held}` }); continue; }
    owner.set(r.email.toLowerCase(), r.customer_id);
    accepted.push(Object.assign({}, r, { job }));
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  if (accepted.length) fs.appendFileSync(FILE, accepted.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return { accepted: accepted.length, refused };
}

// Removes what one job loaded; returns how many rows went.
function removeJob(job) {
  const keep = all().filter((r) => r.job !== job);
  const before = all().length;
  fs.writeFileSync(FILE, keep.map((r) => JSON.stringify(r)).join('\n') + (keep.length ? '\n' : ''));
  return before - keep.length;
}

module.exports = { all, insert, removeJob };
