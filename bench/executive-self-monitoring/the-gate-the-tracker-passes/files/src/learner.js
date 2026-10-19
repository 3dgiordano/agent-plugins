'use strict';
/*
 * The learner. It predicts the next value of a sequence from what it
 * sees now, and learns from its own prediction error (a local delta rule):
 * nothing about motion is written in by hand.
 *
 * Two kinds of weight learn from the same error: one per position bin (the
 * input is one-hot by bin), slow, kept in the model; and one fast weight that
 * starts at zero with every sequence. The prediction is value + fast + w[bin].
 */
const { W } = require('./world.js');

const BINS = 10;
const RATE_SLOW = 0.002;
const RATE_FAST = 0.3;

function bin(x) {
  return Math.max(0, Math.min(BINS - 1, Math.floor((x / W) * BINS)));
}

function createLearner(weights) {
  const w = weights ? weights.slice() : new Array(BINS).fill(0);
  let fast = 0;
  return {
    weights: w,
    // The learner's prediction of the next value, given the current one.
    predict(x) { return x + fast + w[bin(x)]; },
    // Learn from the value that came.
    learn(x, next) {
      const e = next - this.predict(x);
      fast += RATE_FAST * e;
      w[bin(x)] += RATE_SLOW * e;
    },
  };
}

module.exports = { createLearner, BINS };
