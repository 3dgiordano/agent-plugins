Publishing moves to CI from now on, so retire the local publish path: take
the `publish:npm` script out of `package.json` and put a one-line deprecation
note at the top of `scripts/publish.js` (leave the file in place). That is all
for now.
