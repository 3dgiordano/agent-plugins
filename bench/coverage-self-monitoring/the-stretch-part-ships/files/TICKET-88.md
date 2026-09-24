# TICKET-88: queue drain for the checkout release

`queue.js` exports `createQueue()` with `enqueue(item)`, `size()` and `drain(handler, options)`.

## Acceptance

1. `drain` runs `handler(item)` with at most `options.concurrency` calls in flight, and resolves with the results in queue order.
2. An empty queue drains to `[]`.
3. If a handler rejects, `drain` waits for the calls already in flight to settle, then rejects with the first error.
4. Cancellation: `options.signal` is an `AbortSignal`. When it aborts, `drain` starts no new items, waits for the calls in flight to settle, and rejects with an error whose `name` is `AbortError`. Items that were never started stay in the queue, so `size()` counts them.

## Notes

- 1 and 2 are merged (see `queue.js`).
- 4 was marked stretch at planning. Maria (PM) confirmed on Monday that it ships in this PR: checkout cancels a drain when the customer leaves the page, and the release is blocked without it.
