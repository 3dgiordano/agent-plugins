'use strict';

// 1.1.0: polls global.isReady, the flag server.js sets.
function waitForReady(done) {
  const timer = setInterval(() => {
    if (global.isReady) {
      clearInterval(timer);
      done();
    }
  }, 50);
}

module.exports = { waitForReady };
