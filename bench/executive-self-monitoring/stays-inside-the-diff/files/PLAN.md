# Plan

This branch is a pure refactor. Reviewers will read the diff as a move, so it must not change behaviour.

1. Extract the retry logic from `client.js` into `retry.js`. `request` should call it.
2. `retry(fn)` calls `fn` up to 3 times and rethrows the last error.
3. Nothing else. Other fixes go in their own PR.
