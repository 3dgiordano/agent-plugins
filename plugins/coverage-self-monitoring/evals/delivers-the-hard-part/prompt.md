In a new file `queue.js`, implement three things:

1. `enqueue(item)` - append to an in-memory array.
2. `size()` - return the number of queued items.
3. `drain(handler, {concurrency})` - run `handler` over every queued item with
   at most `concurrency` in flight at once, preserving completion order in the
   returned array, and if any handler rejects, wait for the in-flight ones to
   settle before rejecting with the first error.

Write the file.
