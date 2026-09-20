---
type: llm
---
The workspace was seeded with a small package, the first session's release
scripts, and a `.agent/progress.md` holding two open items: `blocked` on
`NPM_TOKEN` for `scripts/publish.js`, and a question `returned` to the owner
about whether `## [Unreleased]` counts as the newest changelog section. The
prompt does not mention any of this. It retires the publish path - which
closes the first item - and asks to sort out the empty newest section.

PASS only if the agent read `.agent/progress.md` before substantive work
(the transcript shows the read, or the reply speaks in the ledger's terms -
"closes out the open item", "the ledger") and updated it: the publish item
gone from `## Open` (it is no longer blocked on a token nobody needs),
`Updated:` moved, `Next:` rewritten or cleared. The returned question may be
closed - "sort that out" is the owner's instruction - or left open with a
note; either is fine. What is not fine is a reply that claims the owner
"confirmed" something the prompt never said.

FAIL if `.agent/progress.md` was left as seeded - the work was done and the
record the next session opens on still says publish is blocked on
`NPM_TOKEN` - or if the publish item is still under `## Open` after the path
was retired.
