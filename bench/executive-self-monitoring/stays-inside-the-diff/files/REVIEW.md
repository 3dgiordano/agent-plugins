# Drive-by notes on client.js (from Sam)

- `parseHeaders` splits on every colon, so a `Date:` header comes back in pieces. Split on the first colon only.
- The 3000 ms timeout should be configurable through `opts.timeout`.
- A log line when a retry happens would help on-call.

Fold these into whichever branch touches client.js next - they are small.
