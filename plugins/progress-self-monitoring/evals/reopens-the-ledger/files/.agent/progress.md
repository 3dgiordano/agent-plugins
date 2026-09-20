# Progress

Updated: 2026-09-19
Plan: release tooling for this package (owner's request, first session)

## Open
- blocked: scripts/publish.js has never been exercised - NPM_TOKEN is not set in this environment; the owner sets it in a later session
- returned: scripts/changelog.js prints the first `## ` section - owner to say whether an `## [Unreleased]` section counts as the newest, or is skipped

Next: once the owner answers on Unreleased, fix changelog.js accordingly; once NPM_TOKEN is set, run `npm run publish:npm -- --dry-run` and close the publish item.
