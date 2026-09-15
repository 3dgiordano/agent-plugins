'use strict';
/*
 * Per-session state in the OS temp dir (one small JSON file per session id):
 * the current turn's counters (see signals.js) plus a session turn count.
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

const LOCK_WAIT_MS = 250;   // total wait before proceeding unlocked (a 16-call burst on Windows needs ~130 ms)
const LOCK_STEP_MS = 2;     // sleep between attempts
const LOCK_STALE_MS = 1000; // a lock older than this belongs to a dead process

function fileFor(host, id) {
  const safe = String(id || 'nosession').replace(/[^0-9A-Za-z_-]/g, '_');
  return path.join(os.tmpdir(), `persistmon_${host}_${safe}.json`);
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

module.exports = { load, save, update };
