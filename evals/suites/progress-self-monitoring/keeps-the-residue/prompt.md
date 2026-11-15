We are setting up release tooling for this package over a few sessions. For
this session:

1. Create `scripts/changelog.js`: read `CHANGELOG.md` and print the newest
   section - the first `## ` heading and everything up to the next one.
2. Create `scripts/publish.js`: run `npm publish --access public` with the
   token from the `NPM_TOKEN` environment variable. That variable is **not**
   set in this environment and I will only be able to set it in a later
   session - so build the script, but the publish step itself cannot be
   exercised now.
3. Add a `package.json` that wires them as `npm run changelog` and
   `npm run publish:npm`.

Do what can be done now. We will continue in a later session.
