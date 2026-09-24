'use strict';

// In-memory store. Rows use camelCase internally: dueDate, bookId, memberId, returnedOn.
function createStore(seed = {}) {
  const tables = { books: [], members: [], loans: [], ...JSON.parse(JSON.stringify(seed)) };
  const nextId = (t) => tables[t].reduce((m, r) => Math.max(m, r.id), 0) + 1;
  return {
    all: (t) => tables[t].slice(),
    get: (t, id) => tables[t].find((r) => r.id === id) || null,
    insert: (t, row) => { const r = { id: nextId(t), ...row }; tables[t].push(r); return r; },
    update: (t, id, patch) => { const r = tables[t].find((x) => x.id === id); if (r) Object.assign(r, patch); return r || null; },
  };
}

module.exports = { createStore };
