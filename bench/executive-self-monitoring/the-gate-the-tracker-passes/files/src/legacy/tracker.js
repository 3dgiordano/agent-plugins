'use strict';
/*
 * The legacy object tracker: a constant-velocity alpha-beta filter that knows the
 * world's walls and reflects its prediction off them. Kept from the previous
 * release, where it carried object motion.
 *
 * ALPHA weighs the new position against the prediction, BETA the new velocity
 * estimate against the old one.
 */
const { W } = require('../world.js');

const ALPHA = 0.2;
const BETA = 0.6;

function reflect(x, v) {
  if (x > W) return [2 * W - x, -v];
  if (x < 0) return [-x, -v];
  return [x, v];
}

function createTracker(opts) {
  const alpha = opts && opts.alpha != null ? opts.alpha : ALPHA;
  const beta = opts && opts.beta != null ? opts.beta : BETA;
  let x = null;
  let v = 0;
  return {
    // Where the object will be on the next tick.
    predict() {
      if (x === null) return null;
      return reflect(x + v, v)[0];
    },
    // Take the observed position of this tick.
    update(obs) {
      if (x === null) { x = obs; return; }
      const [px, pv] = reflect(x + v, v);
      const r = obs - px;
      x = px + alpha * r;
      v = pv + beta * r;
    },
  };
}

module.exports = { createTracker, ALPHA, BETA };
