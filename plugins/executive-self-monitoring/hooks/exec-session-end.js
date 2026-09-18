#!/usr/bin/env node
/*
 * executive-self-monitoring - Claude Code SessionEnd hook (cleanup only).
 *
 * The cadence hook keeps one small turn counter per session, as
 * execmon_<host>_<session>.txt under <temp>/3dgiordano-agent-plugins/. Nothing
 * reads it once the session ends, so this drops it and sweeps anything older
 * than a week on the way past: SessionEnd does not fire when the host is
 * killed, and Cursor has no equivalent event, so the sweep is what keeps the
 * directory from growing by one file per session indefinitely.
 *
 * Emits nothing, never blocks, fails silent.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/*
 * `execmon_` covers every host's counter - execmon_claude_ today, and
 * execmon_cursor_ if Cursor ever grows a non-blocking per-prompt event.
 */
const DIR = path.join(os.tmpdir(), '3dgiordano-agent-plugins');
const PREFIX = 'execmon_';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // a week: longer than any session, shorter than a habit

function main(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch (_) {}

  const sid = typeof data.session_id === 'string' && data.session_id ? data.session_id : 'nosession';
  const safe = sid.replace(/[^0-9A-Za-z_-]/g, '_');
  try { fs.unlinkSync(path.join(DIR, `${PREFIX}claude_${safe}.txt`)); } catch (_) {}

  const cutoff = Date.now() - MAX_AGE_MS;
  try {
    for (const name of fs.readdirSync(DIR)) {
      if (name.indexOf(PREFIX) !== 0) continue;
      const p = path.join(DIR, name);
      try { if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p); } catch (_) {}
    }
  } catch (_) {}
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch (_) {} });
process.stdin.on('error', () => {});
