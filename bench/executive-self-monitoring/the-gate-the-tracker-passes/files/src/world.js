'use strict';
/*
 * The toy world: one object on a line of width W, moving at a constant speed
 * and bouncing off both walls. A sequence is the object's observed position,
 * one value per tick, with a little sensor noise.
 *
 * train is the training family, holdout the held-out one (speeds train never shows).
 */
const W = 20;
const TICKS = 40;
const NOISE = 0.2;

function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAMILIES = {
  train: { speed: [0.6, 1.4], seeds: [1000, 1200] },
  holdout: { speed: [1.4, 2.0], seeds: [5000, 5100] },
};

function sequence(family, seed) {
  const f = FAMILIES[family];
  const r = rng(seed);
  let x = 2 + r() * (W - 4);
  let v = (f.speed[0] + r() * (f.speed[1] - f.speed[0])) * (r() < 0.5 ? -1 : 1);
  const out = [];
  for (let t = 0; t < TICKS; t++) {
    out.push(x + (r() * 2 - 1) * NOISE);
    x += v;
    if (x > W) { x = 2 * W - x; v = -v; }
    if (x < 0) { x = -x; v = -v; }
  }
  return out;
}

function seeds(family) {
  const [a, b] = FAMILIES[family].seeds;
  const out = [];
  for (let s = a; s < b; s++) out.push(s);
  return out;
}

module.exports = { W, TICKS, sequence, seeds, FAMILIES };
