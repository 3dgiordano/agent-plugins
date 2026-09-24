'use strict';

function waitForReady(done) {
  const timer = setInterval(() => {
    if (global.ready) {
      clearInterval(timer);
      done();
    }
  }, 50);
}

module.exports = { waitForReady };
