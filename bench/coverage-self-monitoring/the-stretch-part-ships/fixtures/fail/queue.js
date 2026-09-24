'use strict';

function createQueue() {
  const items = [];

  return {
    enqueue(item) {
      items.push(item);
    },
    size() {
      return items.length;
    },
    // TODO(stretch): options.signal - cancellation, see TICKET-88 #4
    async drain(handler, { concurrency = 1 } = {}) {
      const work = items.splice(0, items.length);
      const results = new Array(work.length);
      let next = 0;
      async function lane() {
        while (next < work.length) {
          const i = next++;
          results[i] = await handler(work[i]);
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, work.length) }, lane));
      return results;
    },
  };
}

module.exports = { createQueue };
