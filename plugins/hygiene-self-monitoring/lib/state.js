'use strict';
/*
 * Per-session state in the OS temp dir (one small JSON file per session id):
 * cadence counters, the public surfaces of the files the session read or changed, and the
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
const PREFIX = 'hygmon_';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function ensureDir() {
  try { fs.mkdirSync(DIR, { recursive: true }); return true; } catch (_) { return false; }
}

ensureDir();

/*
 * One file per actor of a session (lib/host.js actorOf): the main agent's file
 * keeps the name it always had, and a subagent's adds `--<agent id>`, so a
 * subagent's counters are its own and a host that sends no agent id behaves
 * as before. A caller that passes no actor reads and writes the main agent's.
 */
const MAIN = 'main';
const safeId = (s, fallback) => String(s || fallback).replace(/[^0-9A-Za-z_-]/g, '_');

function fileFor(host, id, actor) {
  const base = `${PREFIX}${host}_${safeId(id, 'nosession')}`;
  return path.join(DIR, !actor || actor === MAIN ? `${base}.json` : `${base}--${safeId(actor, MAIN)}.json`);
}

function load(host, id, actor) {
  try { return JSON.parse(fs.readFileSync(fileFor(host, id, actor), 'utf8')) || {}; } catch (_) { return {}; }
}

function save(host, id, state, actor) {
  const file = fileFor(host, id, actor);
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

function update(host, id, fn, actor) {
  const lock = fileFor(host, id, actor) + '.lock';
  const locked = acquire(lock);
  try {
    const st = load(host, id, actor);
    const out = fn(st);
    save(host, id, st, actor);
    return out;
  } finally {
    if (locked) release(lock);
  }
}

function remove(host, id, actor) {
  const files = actor ? [fileFor(host, id, actor)] : [fileFor(host, id)].concat(actors(host, id).map((a) => fileFor(host, id, a)));
  for (const f of files) for (const p of [f, f + '.lock']) { try { fs.unlinkSync(p); } catch (_) {} }
}

/*
 * The subagents that have a record in this session: their agent ids, as the
 * file names carry them (safeId form). Without an actor, remove() drops the
 * main agent's file and all of these - the session is over for every actor.
 */
function actors(host, id) {
  const head = `${PREFIX}${host}_${safeId(id, 'nosession')}--`;
  try {
    return fs.readdirSync(DIR).filter((n) => n.indexOf(head) === 0 && /\.json$/.test(n)).map((n) => n.slice(head.length, -'.json'.length));
  } catch (_) { return []; }
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

module.exports = { load, save, update, remove, actors, sweep, MAIN };
