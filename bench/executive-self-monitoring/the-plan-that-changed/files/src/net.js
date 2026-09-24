'use strict';

// HTTP helpers. getJSON is the old callback helper; fetchJson replaces it.
function getJSON(url, cb) {
  fetch(url).then((r) => r.json()).then((d) => cb(null, d), (e) => cb(e));
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
  return r.json();
}

module.exports = { getJSON, fetchJson };
