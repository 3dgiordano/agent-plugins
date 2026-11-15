'use strict';
/*
 * Where per-session state lives, and whether it can be trusted.
 *
 * One directory per user under the OS temp dir. On Windows the temp dir is the
 * user's own (%TEMP% under the profile) and the name is the collection's. On
 * Linux and macOS the temp dir can be shared (/tmp), so the name carries the
 * user id, the directory is created 0700, and before any read or write it has
 * to be a real directory - not a link - owned by this user with no access for
 * group or others. A directory another user made first, or opened up, is not
 * used: the hooks run without state - no counters, none of the reminders that
 * need them - and say nothing, as on any other state failure. Nothing is read
 * from it, so nothing planted there reaches the agent.
 *
 * This file is the same in every plugin of the collection (a test keeps the
 * copies identical).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const NAME = '3dgiordano-agent-plugins';
const POSIX = process.platform !== 'win32' && typeof process.getuid === 'function';
const UID = POSIX ? process.getuid() : null;
const DIR = path.join(os.tmpdir(), POSIX ? `${NAME}-${UID}` : NAME);

// A directory this user alone can use: an lstat result (a link is refused), its owner, its mode.
function trusted(st, uid) {
  return Boolean(st) && st.isDirectory() && !st.isSymbolicLink() && st.uid === uid && (st.mode & 0o077) === 0;
}

/*
 * Create the directory if it is missing and check it, once per process: a
 * hook is a fresh short-lived process, and the answer does not change inside
 * one. A directory this user owns but left open (an old umask, a chmod) is
 * closed to 0700 first.
 */
let checked = null;
function ready() {
  if (checked !== null) return checked;
  try { fs.mkdirSync(DIR, { recursive: true, mode: 0o700 }); } catch (_) {}
  if (!POSIX) { checked = true; return checked; }
  try {
    let st = fs.lstatSync(DIR);
    if (st.isDirectory() && !st.isSymbolicLink() && st.uid === UID && (st.mode & 0o077) !== 0) {
      fs.chmodSync(DIR, 0o700);
      st = fs.lstatSync(DIR);
    }
    checked = trusted(st, UID);
  } catch (_) { checked = false; }
  return checked;
}

module.exports = { DIR, ready, trusted };
