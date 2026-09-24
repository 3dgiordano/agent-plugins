const { start } = require('./server');
const { waitForReady } = require('./wait');

test('becomes ready', (done) => {
  start();
  waitForReady(done);
}, 60000);
