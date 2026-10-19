'use strict';
/*
 * The Milestone 1 stack: what predicts the next value of a sequence. Today it is
 * the learner alone. One stack per sequence; `frozen` turns learning off.
 */
const { createLearner } = require('./learner.js');

function createStack(model, opts) {
  const frozen = !!(opts && opts.frozen);
  const learner = createLearner(model && model.learner);
  let last = null;
  return {
    // The prediction for the next tick, or null before the first observation.
    predict() { return last === null ? null : learner.predict(last); },
    // Observe this tick's value.
    observe(x) {
      if (last !== null && !frozen) learner.learn(last, x);
      last = x;
    },
    model() { return { learner: learner.weights.slice() }; },
  };
}

module.exports = { createStack };
