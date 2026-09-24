'use strict';

// HTTP helpers. getJSON is the old callback helper; fetchJson replaces it; fetchJsonWithRetry wraps it.
function getJSON(url, cb) {
  fetch(url).then((r) => r.json()).then((d) => cb(null, d), (e) => cb(e));
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
  return r.json();
}

// Added 2026-09-23 with the plan revision: orders, billing and invoices time out under load.
async function fetchJsonWithRetry(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fetchJson(url); } catch (e) { last = e; }
  }
  throw last;
}

module.exports = { getJSON, fetchJson, fetchJsonWithRetry };
