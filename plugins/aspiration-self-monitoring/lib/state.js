'use strict';
/*
 * Per-session state in the OS temp dir (one small JSON file per session id):
 * cadence counters, the turn's edits and the files not reviewed since, and the
 * pending findings of the last stop scan.
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

const LOCK_WAIT_MS = 1500;
const LOCK_STEP_MS = 2;
const LOCK_STALE_MS = 1000;

const DIR = path.join(os.tmpdir(), '3dgiordano-agent-plugins');
const PREFIX = 'aspmon_';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function ensureDir() {
  try { fs.mkdirSync(DIR, { recursive: true }); return true; } catch (_) { return false; }
}

ensureDir();

function fileFor(host, id) {
  const safe = String(id || 'nosession').replace(/[^0-9A-Za-z_-]/g, '_');
  return path.join(DIR, `${PREFIX}${host}_${safe}.json`);
}

function load(host, id) {
  try { return JSON.parse(fs.readFileSync(fileFor(host, id), 'utf8')) || {}; } catch (_) { return {}; }
}

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

function remove(host, id) {
  const f = fileFor(host, id);
  for (const p of [f, f + '.lock']) { try { fs.unlinkSync(p); } catch (_) {} }
}

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
