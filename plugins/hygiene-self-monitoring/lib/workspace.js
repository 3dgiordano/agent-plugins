'use strict';
/*
 * Cursor: the workspace baseline's state id, and how a conversation's
 * first event takes that baseline as its own.
 */

function workspaceId(dir) {
  let h = 0x811c9dc5;
  const s = String(dir || '').replace(/\\/g, '/').toLowerCase();
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return 'ws_' + h.toString(36);
}

// A conversation that has no files yet starts from the workspace baseline,
// if one was taken in the last day.
function adopt(st, baseline) {
  if (st.adopted) return;
  st.adopted = true;
  if (st.files && Object.keys(st.files).length) return;
  if (!baseline || !baseline.files || !(Date.now() - (baseline.taken || 0) < 24 * 60 * 60 * 1000)) return;
  st.files = JSON.parse(JSON.stringify(baseline.files));
}

module.exports = { workspaceId, adopt };
