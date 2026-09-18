# Changelog

All notable changes to this repository. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the repository
version is independent of the per-plugin versions, which are listed in each
release.

## [Unreleased]

## [0.4.0] — 2026-09-17

Five layers of checking instead of one, and the defects the new ones found.
The suite now asks whether each detector catches what it exists to catch,
whether the README still quotes what the code emits, whether both hosts stay
wired — and, against a no-plugin baseline arm, whether a plugin actually
changes what the model does. Four of five scored cases say it does.

| Plugin | Version |
|--------|---------|
| executive-self-monitoring | 1.3.5 |
| epistemic-self-monitoring | 0.1.7 |
| persistence-self-monitoring | 0.1.6 |
| termination-self-monitoring | 0.1.7 |
| coverage-self-monitoring | 0.1.7 |
| handoff-self-monitoring | 0.1.5 |

### Added
- `scripts/samples.js` — generates the README's message samples from the code
  that emits them; `--check` fails CI on drift, `--fix` rewrites them. Added
  after four of the five samples went a release out of date.
- `scripts/corpus.js` + `evals/corpus/*.jsonl` — recall / precision of the six
  detectors against 238 labelled lines, with per-detector floors.
- `scripts/hosts.js` — drives all 44 declared adapters with host-shaped
  payloads and requires every Claude Code / Cursor asymmetry to be declared.
- a CHANGELOG check in the suite: the newest release table must match every
  plugin's manifests, and every version named inside its entries must match
  that table. Those labels drifted three times while this release was being
  assembled - a bump lands and the prose above it keeps the old number.
- `plugins/*/evals/` — one behavioural case per plugin for
  `claude plugin eval --ablation with-without`.
- `scripts/cursor-eval.js` — the Cursor side of the behaviour layer, on the
  Cursor Agent CLI (`agent`). It reuses the `prompt.md` files already written
  for `claude plugin eval`, so one case set serves both hosts, and builds the
  with/without arm out of `--plugin-dir`.

  **First measured result: 4 of 5 scored cases show the plugin changing the
  output, 100% with against 0% without** (n=2 per arm, isolated `HOME`, a fresh
  workspace per invocation). Each case is graded by its plugin's own close
  scanner — a well-formed block with zero violations, not merely the bracket,
  so an opened `[HANDOFF]` with an undecided fork does not score.

  Two measurements bound what it may claim. `--plugin-dir` **does** load a local
  plugin's skills (verified with a synthetic probe plugin holding a uniquely
  named skill). The headless CLI **does not run hooks** — a project-level
  `.cursor/hooks.json` probe never fired under `-p` — so on this CLI a plugin
  reduces to its skill, and this is an eval of the skill layer and not of the
  wiring. It says so in its own output. Nothing here speaks for Cursor the IDE.

  It also refuses to report a delta when the plugins are installed globally
  under `~/.cursor/plugins/local`, because the CLI loads those with no flag and
  offers no way to disable them, leaving the baseline arm no baseline at all.
  `--isolate` gives it a scratch `HOME`; the session survives that, since the
  CLI keeps credentials outside `HOME`, and only if it ever does not does the
  script ask for `CURSOR_API_KEY` rather than copy a session file elsewhere.

  The epistemic case reads 0 and is documented as **not discriminating** rather
  than as a plugin doing nothing: the baseline writes a well-formed
  `[EPISTEMIC CLOSE]` unaided, and no deterministic feature separated the arms.
  Its `NOTES.md` records what was ruled out — isolation leaking, the format
  sitting in model priors — and why the prompt, not the grader, is what needs
  replacing.
- **CI can no longer invoke an agent CLI.** It never did, but nothing stopped
  it: `scripts/test.js` now fails if a CI step shells out to one, if a
  CI-invoked script starts one, or if a script that does gets added to the
  workflow. The check also asserts its own detection still works — the first
  version passed trivially, because the `AGENT_CLI_DRIVER` marker sat in a
  header comment and the check strips comments before looking.
- **all six plugins** — session-end cleanup. Each plugin kept its per-session
  state file in the temp dir and never removed it, so a busy week left one file
  per plugin per session lying around. A `SessionEnd` adapter now drops the
  session's file; because `SessionEnd` does not fire when the host is killed,
  and Cursor has no equivalent event, `state.sweep()` also drops anything more
  than a week old. The Cursor session-start adapters call the sweep.
- **coverage, epistemic, handoff, termination** — `SubagentStop` is wired, as a
  **measurement only**: the close scan is logged (as `subagent_stop` /
  `subagent_close`, tagged with `agent`) and nothing else. It never blocks,
  even under the strict gates, and never parks a retrospective — a subagent has
  no next user prompt for one to ride on, so parking would deliver a
  subagent's close to the *parent's* next turn. Until now a subagent's final
  message passed through none of the four close gates and was not even counted;
  this makes it countable before anyone decides a gate is worth its cost.

### Changed
- **all six plugins** — per-session state now lives in one directory,
  `<os-temp-dir>/3dgiordano-agent-plugins/`, instead of loose among every other
  process's files. Named after the marketplace, so it is obvious what created
  it and the whole set can be listed or removed in one step. The session-end
  sweep enumerates only that directory, which narrows what the security
  contract has to allow rather than widening it.
- **executive-self-monitoring 1.3.5** — the turn counter joins that directory
  as `execmon_<host>_<session>.txt`, the same name shape as the other five.
  The host belongs in the middle rather than in front: the counter is
  host-neutral and this is the Claude adapter's copy of it. The sweep keys on
  `execmon_`, so a future `execmon_cursor_` needs no further change. On
  upgrade, a session in flight restarts its cadence at turn 1.

### Fixed
- **persistence, epistemic, handoff 0.1.6 / 0.1.7 / 0.1.5** — `lib/fail.js`, the
  shared "did this shell output fail?" detector, missed nine of thirteen real
  failure shapes: a file-prefixed error (`a.js:12: TypeError: …`, the commonest
  JS/TS form), webpack's `ERROR in ./src/index.js`, Java's `Exception in
  thread`, Maven's `[ERROR]`, a Rust `panicked at`, and `exited with 1` without
  the word *code*. Corpus recall went 72.4% → 100% with precision held at 100%.
  The patterns carry lookaheads so prose about them stays out — `[ERROR] is how
  log4j marks a line`, `exit 0 means success; exit 1 means failure`. All three
  copies of the file stay byte-identical, as the suite already required.
- **epistemic-self-monitoring 0.1.7** — the closure scan no longer reads a
  *documented* `[EPISTEMIC CLOSE]` block as a real one. It was the only
  close-scanner without a `prose()` step, so a fenced example of the block
  format — what a message explaining the skill looks like — was scanned as a
  declared closure, and under `EPIMON_STRICT` that blocked the stop. Fenced
  code, inline code and quoted lines are now stripped first, as in the
  termination, coverage and handoff scanners. A real block that *follows* an
  example is still judged.
- **termination-self-monitoring 0.1.7** — seven phrasings the README and
  `SKILL.md` advertise as triggers now actually match: deferring the work to a
  follow-up session, *approaching* the context limit (the existing pattern
  needed a copula), conserving context, having used most of it, offering how
  much it used as the reason, and "this is taking too long". Corpus recall
  went 78.8% → 100% with precision held at 100%; the patterns are first-person
  anchored and the deferral one requires a session-shaped destination, so
  "deferring the docs to the owner" still does not fire.
- **coverage-self-monitoring 0.1.7** — two deferral phrasings now match:
  "left the migration as a TODO" (the verb takes a named object, not only a
  pronoun) and "I haven't wired …" (the verb list is lemmatised, so the
  participle counts as well as the base form).
- **coverage-self-monitoring 0.1.7** — the stub counter no longer counts a
  marker that sits inside a *string literal*: `getAttribute('placeholder')`
  reads a DOM attribute and a test fixture quoting `"// TODO"` is describing a
  marker, not leaving one. Quoted spans are blanked before matching, except
  for the two rules whose payload IS a string (`throw new Error('TODO …')`,
  `pass # TODO`). And `placeholder`, unlike TODO/FIXME/XXX/HACK, is an
  ordinary word in UI code, so it now only counts inside a comment.
- **handoff-self-monitoring 0.1.5** — "which one to pick depends on whether …"
  is recognised as a fork. The existing pattern needed the pronoun adjacent to
  *depends*; the new one is anchored on a choice-shaped object
  (whether/which/what/if) instead, so "the scheduler depends on lodash" and
  "throughput depends on how many workers" stay out.

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

[Unreleased]: https://github.com/3dgiordano/agent-plugins/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.4.0
[0.3.1]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.3.1
[0.3.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.3.0
[0.2.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.2.0
[0.1.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.1.0
