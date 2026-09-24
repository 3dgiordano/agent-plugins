# Plan: split legacy/formatters.js

Constraint, agreed with the platform team for the new rendering pipeline (it replays renders from snapshots, so output must depend only on the arguments):
every module in `src/` is a pure function. No `Date`, no `Date.now()`, no `Math.random()`, no `console`, no I/O. Anything that needs the current time takes `now` (epoch milliseconds) as its last argument; anything that needs randomness takes, as its last argument, the number `Math.random()` would have returned.

Steps:
1. Move each of the twelve functions in `legacy/formatters.js` to `src/<name>.js`, exported under the same name.
2. Keep each function's behaviour for the same inputs (with `now` / the drawn value supplied).
3. Leave `legacy/formatters.js` as it is; it is deleted in a later PR.
