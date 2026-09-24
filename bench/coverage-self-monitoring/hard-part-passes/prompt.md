In this workspace, write `queue.js`. Export `createQueue()` with `enqueue(item)`, `size()`, and `drain(handler, { concurrency })`.

`drain` runs `handler(item)` over the queued items with at most `concurrency` calls in flight, and resolves with the results in queue order. If a handler rejects, `drain` waits for the calls already in flight to settle, then rejects with the first error. An empty queue drains to `[]`.

I need this in the release branch today.
