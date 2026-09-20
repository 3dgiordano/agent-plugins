'use strict';
/*
 * Per-session state in the OS temp dir (one small JSON file per session id):
 * cadence counters, the current turn's counters where the plugin has them, and
 * the pending findings of the last stop scan.
 *
 * Hooks are separate processes and hosts fire PostToolUse for parallel tool
 * calls concurrently, so a plain read-modify-write loses increments exactly
 * when the agent is busiest. `update()` serialises the read-modify-write with
 * a lockfile: `wx` create, a real sleep between tries (Atomics.wait - no CPU
 * spin), a short deadline, and a stale-lock breaker for a process that died
 * holding it. If the lock cannot be had in time the update proceeds without
 * it - a lost increment is cheaper than a lost event, and the hook must never
 * stall the host. The write goes through a temp file and a rename so a reader
 * never sees a torn file, with an in-place write as the fallback.
 *
 * Every access fails silent: state loss only means a missed reminder.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

/*
 * How long an update waits for the lock before giving up and proceeding
 * unlocked. 250 ms was sized against a 16-call burst measured at ~130 ms -
 * under 2x margin, and a machine under load spends it: the same burst then
 * counted 5 of 8 calls, because every process gave up and raced.
 *
 * 1500 ms is an order of magnitude over that worst case and still bounded,
 * so a hook cannot stall the host for long. It is only ever spent under real
 * contention; an uncontended update takes the lock on the first try.
 */
const LOCK_WAIT_MS = 1500;
const LOCK_STEP_MS = 2;     // sleep between attempts
const LOCK_STALE_MS = 1000; // a lock older than this belongs to a dead process

/*
 * One directory for everything these plugins keep in the OS temp dir, named
 * after the marketplace so a person (or a cleanup script) can see at a glance
 * what put it there, list it, and delete it whole. Before this the files sat
 * loose among every other process's temp files.
 *
 * mkdir is attempted on each write rather than once at load: a hook is a fresh
 * short-lived process, and the directory may have been swept between runs.
 */
const DIR = path.join(os.tmpdir(), '3dgiordano-agent-plugins');
const PREFIX = 'handmon_';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // a week: longer than any session, shorter than a habit

function ensureDir() {
  try { fs.mkdirSync(DIR, { recursive: true }); return true; } catch (_) { return false; }
}

/*
 * Once per process, not once per save: a hook is short-lived, and inside
 * save() this sat in the critical path of every update - a 16-process burst
 * then pushed past the lock deadline and lost increments.
 */
ensureDir();

function fileFor(host, id) {
  const safe = String(id || 'nosession').replace(/[^0-9A-Za-z_-]/g, '_');
  return path.join(DIR, `${PREFIX}${host}_${safe}.json`);
}

function load(host, id) {
  try { return JSON.parse(fs.readFileSync(fileFor(host, id), 'utf8')) || {}; } catch (_) { return {}; }
}

// Temp file + rename so a concurrent reader never sees a torn file. On
// Windows the rename can fail transiently (EPERM) while a scanner holds the
// target open; then write in place rather than lose the state - under the
// lock that is still consistent, only no longer torn-proof for that one write.
function save(host, id, state) {
  const file = fileFor(host, id);
  const tmp = `${file}.${process.pid}.tmp`;
  const json = JSON.stringify(state);
  try {
    fs.writeFileSync(tmp, json);
    fs.renameSync(tmp, file);
  } catch (_) {
    try { fs.unlinkSync(tmp); } catch (_2) {}
    try { fs.writeFileSync(file, json); } catch (_3) {}
  }
}

function sleep(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch (_) {}
}

function acquire(lock) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try { fs.closeSync(fs.openSync(lock, 'wx')); return true; } catch (_) {}
    try { if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) fs.unlinkSync(lock); } catch (_) {}
    if (Date.now() >= deadline) return false;
    sleep(LOCK_STEP_MS);
  }
}

function release(lock) {
  try { fs.unlinkSync(lock); } catch (_) {}
}

// Read, let `fn` mutate the state object (its return value is passed back),
// write - under the lock when it can be had.
function update(host, id, fn) {
  const lock = fileFor(host, id) + '.lock';
  const locked = acquire(lock);
  try {
    const st = load(host, id);
    const out = fn(st);
    save(host, id, st);
    return out;
  } finally {
    if (locked) release(lock);
  }
}


/*
 * Drop this session's state file. The counters are scoped to the session and
 * nothing reads them once it ends, so a file left behind is pure residue -
 * one per plugin per session, for as long as the temp dir survives.
 */
function remove(host, id) {
  const f = fileFor(host, id);
  for (const p of [f, f + '.lock']) { try { fs.unlinkSync(p); } catch (_) {} }
}

/*
 * SessionEnd does not fire when the host is killed, and not every host has the
 * event at all, so also drop anything older than MAX_AGE_MS on the way past.
 * A session file is a handful of bytes and the OS clears its own temp dir
 * eventually; this just keeps the directory honest in between.
 */
function sweep(now) {
  const cutoff = (typeof now === 'number' ? now : Date.now()) - MAX_AGE_MS;
  let dropped = 0;
  try {
    for (const name of fs.readdirSync(DIR)) {
      if (name.indexOf(PREFIX) !== 0) continue;
      const p = path.join(DIR, name);
      try {
        if (fs.statSync(p).mtimeMs < cutoff) { fs.unlinkSync(p); dropped += 1; }
      } catch (_) {}
    }
  } catch (_) {}
  return dropped;
}

module.exports = { load, save, update, remove, sweep };
