# Changelog

All notable changes to this repository. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the repository
version is independent of the per-plugin versions, which are listed in each
release.

## [Unreleased]

## [0.3.1] — 2026-09-16

Protocol blocks as markdown lists in the message, not fenced code blocks —
fences do not wrap, and a long `Options` line became a horizontal scroll.

| Plugin | Version |
|--------|---------|
| executive-self-monitoring | 1.3.3 |
| epistemic-self-monitoring | 0.1.4 |
| persistence-self-monitoring | 0.1.4 |
| termination-self-monitoring | 0.1.4 |
| coverage-self-monitoring | 0.1.4 |
| handoff-self-monitoring | 0.1.2 |

### Changed
- **handoff-self-monitoring 0.1.2** — `[HANDOFF]` is a markdown list in the
  message, not a fenced code block (fences do not wrap). `Options` is one
  alternative per line, `Default` on its own line. The scanner still accepts
  a one-line `A | B` from older closes; the skill no longer teaches that
  form. Sibling list items after `Options` (`- A: …` at the same indent)
  count as alternatives, so a flattened list still parses.
- **coverage-self-monitoring 0.1.4**, **epistemic-self-monitoring 0.1.4**,
  **persistence-self-monitoring 0.1.4**, **termination-self-monitoring 0.1.4**,
  **executive-self-monitoring 1.3.3** — protocol blocks are markdown lists
  in the message, not fenced code blocks, matching handoff. Scanners still
  accept a fenced copy of the same block (`scripts/test.js` locks that).
  No blank line inside a block (the scanner stops at the first one).

## [0.3.0] — 2026-09-16

A sixth plugin for structured handoff, sibling-plugin wiring to it, and
act-first skills so the protocol blocks can be written in any language.

| Plugin | Version |
|--------|---------|
| executive-self-monitoring | 1.3.2 |
| epistemic-self-monitoring | 0.1.3 |
| persistence-self-monitoring | 0.1.3 |
| termination-self-monitoring | 0.1.3 |
| coverage-self-monitoring | 0.1.3 |
| handoff-self-monitoring | 0.1.1 |

### Added
- **handoff-self-monitoring 0.1.0** — structured-handoff discipline for the
  final message of a turn. The agent knows the state, the problem and the
  open decision, and writes its close in the register of its own trace; the
  reader, who has the message and not the trace, cannot tell what to decide
  or do next (curse of knowledge, illusion of transparency, writer-based
  prose). The `[HANDOFF]` block is modelled on the SBAR / I-PASS handoff
  protocols: `Status` (done | needs-decision | blocked), `Situation` in the
  reader's terms, `Options` with a `Default` when there is a fork,
  `Blocked-by` when blocked, `Next` as one action or `nothing`. Three
  layers: load on the first prompt and every 10th; a pre-close nudge on the
  first closing-shaped tool call of the turn (a green test / build run, a
  commit or push, a PR opened) — the scaffold arrives when the final message
  is about to be written, which is also what reaches the silent case; a Stop
  scan for a decision named but not handed off (an offer, a fork, a question
  in the last 6 lines, a `returned` coverage part) and for the block's
  rules. Non-blocking by default with a next-prompt retrospective,
  `HANDMON_STRICT=1` blocks once. Claude Code: `UserPromptSubmit`,
  `PostToolUse`, `Stop`; Cursor: `sessionStart`, `postToolUse`,
  `afterAgentResponse`, `stop`. Sixth question in the README: *can the
  reader act on what I wrote?*; `scripts/calibrate.js` reads its log.
- Mark for the new plugin (an arrow reaching a receiving bar) and the social
  preview updated to the six questions.

### Changed
- **handoff-self-monitoring 0.1.1**, **coverage-self-monitoring 0.1.3**,
  **termination-self-monitoring 0.1.3** — skill and injected reminders name
  the *act* first (an offer, a hole in the delivery, a stop on a feeling);
  English phrases stay as examples and as the hook lexicon backstop. Block
  field names stay in English; values and the rest of the message follow the
  language of the turn. `scripts/test.js` locks that contract: English
  lexicon hits still fire, Spanish semantic equivalents do not, and an
  English-keyed block with Spanish values still passes.
- **coverage-self-monitoring 0.1.2** — the `returned` state points at the
  `[HANDOFF]` block: the owner's choice reaches them formulated (options,
  consequences, a default), not named. README: boundary with
  handoff-self-monitoring, whose scanner reads the `returned` lines of the
  `[COVERAGE CHECK]`.
- **termination-self-monitoring 0.1.2** — `owner-choice` is asked in the
  `[HANDOFF]` block, so the reader gets a decision and not an offer. README:
  the form of a justified stop is handoff's.
- **persistence-self-monitoring 0.1.3** — the *Report* decision is written as
  a handoff (status, situation, options with a default, one action asked),
  not as a log of the attempts.
- **epistemic-self-monitoring 0.1.3** — the closure block says whether the
  claim is true; whether it reaches the reader usable is the `[HANDOFF]`
  block's job. Cross-reference to handoff-self-monitoring.
- SECURITY: three opt-in gates (handoff's `HANDMON_STRICT` joins epistemic's
  and termination's); the handoff scanner's interpolated values listed in the
  scope notes. Issue templates list all six plugins.

## [0.2.0] — 2026-09-15

Two new plugins, a review pass over all five, and the calibration tool.

| Plugin | Version |
|--------|---------|
| executive-self-monitoring | 1.3.2 |
| epistemic-self-monitoring | 0.1.2 |
| persistence-self-monitoring | 0.1.2 |
| termination-self-monitoring | 0.1.1 |
| coverage-self-monitoring | 0.1.1 |

### Added
- **termination-self-monitoring 0.1.0** — checkable-reason discipline for
  stopping, deferring, narrowing or softening. A Stop scan catches the
  state-shaped reasons a model inherits from its training data ("running out
  of context", "long session", "pick this up later", "not confident enough",
  "given the complexity", a run of apologies) and asks for one of four
  checkable reasons — `gate-not-run`, `owner-choice`, `budget-spent`,
  `limit-observed` — or `none`, which means continue. `[TERMINATION CHECK]`
  block; non-blocking by default with a next-prompt retrospective,
  `TERMMON_STRICT=1` blocks once. Claude Code: `UserPromptSubmit`, `Stop`;
  Cursor: `sessionStart`, `afterAgentResponse`, `stop`.
- **coverage-self-monitoring 0.1.0** — parts-ledger discipline for multi-part
  or hard tasks: `[COVERAGE LEDGER]` before (the parts, the hardest and why,
  hardest first), `[COVERAGE CHECK]` after (each part done / blocked with an
  observed reason / returned to the owner). Hooks count stub, placeholder and
  `TODO` markers written per turn (nudge at 3, net of markers in the replaced
  text), ask for the ledger when the prompt enumerates 3+ items, and flag
  deferral language with no closing ledger. Never blocks. Claude Code:
  `UserPromptSubmit`, `PostToolUse`, `Stop`; Cursor: `sessionStart`,
  `postToolUse`, `afterAgentResponse`.
- CONTRIBUTING rule 5: a plugin is named for the decision or variable it
  monitors, never for an internal state; the proposal template asks for it.
- `scripts/calibrate.js`: reads the opt-in logs of every plugin from one or
  more project directories and prints, per threshold, the distribution of the
  per-turn measurement and the what-if nudge rate at each candidate value —
  the tool for tuning the defaults against real sessions before 1.0.
- Marks for the two new plugins (halmos; three-line ledger) and the social
  preview updated to the five questions.
- Visual identity: mascot (`assets/logo.svg`), a mark per plugin
  (`plugins/<name>/assets/logo.svg`, referenced from the Cursor manifests), and
  a 1280×640 social preview.
- `SECURITY.md` with the hooks' behaviour contract and private reporting.
- `CONTRIBUTING.md`, issue templates (bug report, plugin proposal) and a PR
  template.
- This changelog.
- Dependabot for the GitHub Actions used by CI (monthly, grouped) and an
  `.editorconfig` matching the existing formatting.

### Changed
- **epistemic-self-monitoring 0.1.1** — new protocol step *Register is not
  evidence*: hedging words ("I'm not sure", "probably") are not claim
  statuses and neither downgrade a verified claim nor upgrade a conjecture;
  to soften a claim, name its falsifier; state green and red results in the
  same voice. Cross-reference to termination-self-monitoring for "not
  confident" used as a reason to stop.
- **persistence-self-monitoring 0.1.1** — the *Decide* step states that a
  count is what licenses stopping; stopping on a phrase is the
  termination-self-monitoring skill's territory.
- **executive-self-monitoring 1.3.1** — new drift signature *Scope shrink*
  (delivering the tractable subset and reporting it as done), pointing at
  coverage-self-monitoring.
- README opens with what the agent actually sees (real nudges), a two-command
  quick start and a "What the hooks do — and don't" section, before the
  cognitive framing; framed around five questions, with the two new plugins.

### Fixed
- **persistence-self-monitoring 0.1.2, epistemic-self-monitoring 0.1.2** —
  a green test run was counted as a failure: the words *error* / *failed*
  anywhere in the output (`Tests: 5 passed, 0 failed`, a grep for "error
  handling") made three green `npm test` runs into *"npm test has failed 3
  times"*, and fired epistemic's observe nudge on every green suite. Failure
  detection now lives in `lib/fail.js` (identical copy in both plugins, kept
  equal by a test): line rules for real failure shapes — non-zero exit code,
  traceback, `fatal:` / `panic:`, a non-zero `N failed` / `N errors`, `npm
  ERR!`, `make: ***`, `FAIL`/`FAILED`, `Error:` / `error[E…]:` / `error
  TS…:`, assertion failures, "command not found" — and never a bare word. The
  host's `{stdout, stderr}` object is read as text rather than stringified,
  so line-anchored rules see lines. The error signature comes from the same
  rule, so a green summary can no longer become "the same error 3 times".
- **coverage-self-monitoring 0.1.1** — a whole-file Write over a legacy file
  full of old `TODO`s fired the stub nudge at once. The counter now reads the
  host's structured result: Claude Code's `structuredPatch` (`+` lines minus
  `-` lines) on Write and Edit, `type: 'create'` counts the new file in full,
  and whole-file `content` with nothing to compare against is not counted.
  Cursor's `// ... existing code ...` marker is explicitly not a stub. Also:
  the "block with no part lines" rule was per message instead of per
  `[COVERAGE CHECK]` block, so a second, empty block passed.
- **termination-self-monitoring 0.1.1** — "this is a large task" / "it is a
  big task" (scoping, not fatigue) matched the budget lexicon; the duration
  pattern now covers *session / conversation / day* only. "I'd rather not
  try …" (the switch decision persistence asks for) matched confidence; that
  pattern now covers *risk / touch / change / modify* only. `Reason:` is
  matched as an enum — a qualifier may follow (`gate-not-run (npm test)`),
  but `none-of-the-above` / `none yet` no longer pass as `none`.
- **all five plugins** (persistence 0.1.2, epistemic 0.1.2, executive 1.3.2,
  termination 0.1.1, coverage 0.1.1) — per-session state was a plain
  read-modify-write; hosts run PostToolUse hooks for parallel tool calls
  concurrently, and 16 simultaneous calls counted as few as 4. `state.update()`
  now serialises the update with a lockfile (`wx` create, real sleep via
  `Atomics.wait`, 250 ms deadline, stale-lock breaker; proceeds unlocked past
  the deadline rather than drop the event) and writes through a temp file +
  rename with an in-place fallback. Exact up to 16 parallel calls on Windows;
  a test holds the contract at 8. And the loggers fell back to
  `process.cwd()` — the plugin's install dir — when no `cwd` came with the
  event; `lib/host.js` (`cwdOf`: event `cwd` → `workspace_roots` →
  `CLAUDE_PROJECT_DIR` / `CURSOR_PROJECT_DIR` → null) replaces every
  hand-rolled `workspaceOf`, and a null project dir means no log at all.
- README: a host-coverage table saying which layers Cursor does not get
  (coverage's ledger prompt and close-scan retrospective, the epistemic and
  termination retrospectives); `scripts/calibrate.js` adds an *all plugins
  together* view — text blocks injected per prompt and mid-turn nudges per
  prompt across the installed set — so "too many plugins" is measured before
  it is decided.

## [0.1.0] — 2026-09-15

First public release.

| Plugin | Version |
|--------|---------|
| executive-self-monitoring | 1.3.0 |
| epistemic-self-monitoring | 0.1.0 |
| persistence-self-monitoring | 0.1.0 |

### Added
- **executive-self-monitoring 1.3.0** — plan-anchored drift self-check,
  project-agnostic. Claude Code: `UserPromptSubmit` on turn 1 then every 5th;
  Cursor: `sessionStart` once per session; Agent Plugins manifest.
- **epistemic-self-monitoring 0.1.0** — observation-vs-conjecture discipline.
  Load / observe / close layers on both hosts; `[EPISTEMIC CLOSE]` closure
  gate, non-blocking by default, `EPIMON_STRICT=1` blocks once.
- **persistence-self-monitoring 0.1.0** — persist-or-quit signal from per-turn
  counters (same file edited 4×, same command or error failing 3×, 30 tool
  calls); never blocks.
- `scripts/test.js` (30 tests driving every hook adapter as its host would)
  and CI on Ubuntu/Windows × Node 18/20/22.
- `scripts/version.js` to keep each plugin's three manifests on one version.

### Fixed
- epistemic-self-monitoring: a mention of `[EPISTEMIC CLOSE]` in prose or
  backticks was scanned as a closure block; the marker must now stand alone
  on its line.

[Unreleased]: https://github.com/3dgiordano/agent-plugins/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.3.1
[0.3.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.3.0
[0.2.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.2.0
[0.1.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.1.0
