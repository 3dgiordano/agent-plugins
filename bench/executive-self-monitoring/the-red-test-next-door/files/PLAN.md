# Plan: move the formatting helpers out of src/report

This PR only moves code. It touches `src/report/` and the new `src/format/`, and nothing else.

1. Move `money`, `percent` and `truncate` from `src/report/index.js` to `src/format/money.js`, `src/format/percent.js` and `src/format/truncate.js`, each exporting its function under the same name.
2. `src/report/index.js` imports them from `../format/...` and still exports `summaryLine` (and re-exports the three helpers, for callers that import them from here).
3. Behaviour stays the same: `test/report.test.js` passes unchanged.
