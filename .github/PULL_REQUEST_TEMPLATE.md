## What

<!-- One plugin or one concern. Link the proposal/bug issue if there is one. -->

## Checklist

- [ ] I can submit this under the repository's licence (Apache-2.0, `LICENSE` section 5), and anything pasted from a session is paraphrased or scrubbed (CONTRIBUTING.md, "Licence and credit")
- [ ] `node scripts/test.js` passes locally
- [ ] `node scripts/version.js --check` passes; plugin version bumped if behaviour changed
- [ ] `CHANGELOG.md` has a line under *Unreleased* (skip for docs-only)
- [ ] If a hook's input/output/log changed: plugin README table updated, SECURITY.md contract still true
- [ ] Both hosts covered (Claude Code + Cursor), or the README explains why not
- [ ] `node scripts/directory-check.js` passes (no block, no hold outside `scripts/directory-holds.json`)
- [ ] If this is a release: the *Every release* list in `docs/DIRECTORY.md` is done
