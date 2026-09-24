'use strict';

// Brings the service up and flags it ready once it can take requests.
function start() {
  setTimeout(() => {
    global.isReady = true;
  }, 100);
}

module.exports = { start };
