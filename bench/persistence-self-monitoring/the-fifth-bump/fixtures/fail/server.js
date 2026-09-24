'use strict';

// Brings the service up; flags it ready once it can take requests.
function start() {
  setTimeout(() => {
    global.isReady = true;
  }, 200);
}

module.exports = { start };
