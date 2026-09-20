# Changelog

All notable changes to this repository. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the repository
version is independent of the per-plugin versions, which are listed in each
release.

## [0.6.0] — 2026-09-20

What an injected message has to carry, measured rather than reasoned about.
The pointer design of 0.5.0 was right about the prose and wrong about the
names: an agent that already knows the protocol still needs the shape, and the
shape is the field names. Naming them moved executive from 0/6 to 5/6 and
handoff's pre-close from 0/3 to 3/3, while the messages that fire constantly
got shorter.

Then three defects of the same family as the four before them — the scanner
refusing a correct block over its formatting — and the first one of the family
that was *silent*: a marker that opened a line and parsed as nothing produced
no block and no violation, so the run reported the plugin as never having
fired. All thirteen eval cases end the release green on Claude Code: 7 of 7
block cases changing the output, 6 of 6 quiet cases costing nothing.

| Plugin | Version |
|--------|---------|
| executive-self-monitoring | 1.5.0 |
| epistemic-self-monitoring | 0.1.11 |
| persistence-self-monitoring | 0.1.11 |
| termination-self-monitoring | 0.1.11 |
| coverage-self-monitoring | 0.1.11 |
| handoff-self-monitoring | 0.1.10 |

### Changed
- **executive 1.5.0** — the load message names the block's four fields instead
  of pointing at the skill for them, and that is the whole of the change.
  Measured with the Skill tool's own `PreToolUse` hook logging every
  invocation, six runs per configuration:

  | configuration | skill loaded | block written |
  |---|---|---|
  | skill available, no message at all | 0/6 | 0/6 |
  | skill + a message that points at it | 0/6 | 0/6 |
  | skill + a message naming Plan, Gate, Drift, Decision | 0/6 | **5/6** |

  The skill was never loaded, in any configuration. The agent was not missing
  the protocol — the failing transcripts quote the gate and name every tangent
  in prose — it was missing the shape of the block, which is precisely what the
  pointer design had removed from the message.

  A pointer only works when what it points at is what the reader lacks.
- **the five event messages are pointers, with the field names kept.**
  `preclose`, `retrospective`, `nudge` and `blockReason` used to restate the
  protocol they point at. What stays is what the scanner reads — the marker,
  the field names, the status and reason tokens — and what goes is the prose
  the skill already carries, named as `(<plugin> skill, "Core Protocol")`.

  Measured on handoff's pre-close, same case and scanner, one variable:
  **0 of 3 with the old wording, 3 of 3 with the new.** All three old runs wrote
  the marker and none wrote a block the scanner accepted; two opened a field
  called `Next action:`, which is the message's own phrase, and none produced
  `Situation:`, because "the situation" inside a sentence does not read as a
  label. **The prose of a message becomes the field names of the block.**

  Summed over all eighteen messages this moves 3%, because naming fields costs
  characters. Weighted by a real session's firing rates — the messages that grew
  fire only after a violation or under a gate that is off by default, the ones
  that shrank fire constantly — it is −20%, about 690 tokens over eleven turns.

- **handoff 0.1.10** — the Status field carries its three values into `LOAD`
  and `preclose`. The skill named them and the message named only the field, so
  on a review turn the agent wrote `Status: Reviewed; <the finding>` in **6 of
  6 runs** — a well-formed block, `Options` and `Next` correctly laid out
  below it, whose only violation was that word. The case scored **0%**.

  The enum is in the message for the same reason the field names are: the
  scanner reads the *value* against that set, which makes the set scanner-read
  content rather than the protocol prose that 0.5.0 measured as harmful. It is
  deliberately **not** in `retrospective` or `blockReason`, which carry the
  violations and so quote the three values already.

  The skill gained the rule the enum alone does not teach: an activity is not a
  status. `Reviewed`, `Analysed`, `Investigated` name what you did, and the
  reader triages on what they must do. An assessment that hands back a choice
  is `needs-decision`; the finding goes in `Situation`, which is the slot for
  it. Measured: **0% → 100%**, and the `Default` violations that were predicted
  to be hiding behind the invalid status never appeared — framing the turn
  correctly brought the default with it.

### Added
- **`handoff/hands-off-after-a-green-gate`** — the first case that reaches a
  message other than `LOAD`. Every other case is `intent: answer`: one reply,
  no tools, no previous turn, so the pre-close, the retrospective and the gate
  never fire and three of handoff's four messages were unmeasured by anything.
  Here the agent writes two files and runs `node test-slug.js`, which the
  closing-signal detector counts as a green gate.
- **`evals/PROTOCOL.md`** gains three sections from this round: how to write an
  injected message, why a guard written from one sample is a guard for one
  sample, and the host asymmetry above.

### Fixed
- **executive 1.5.0 — a botched block is no longer indistinguishable from no
  block.** `BLOCK_RE` wants the marker alone on its line, and one run wrote
  `[PLAN CHECK] Plan: … Gate: … Drift: … Decision: refocus` on a single line:
  every field present, the gate quoted, and `refocus` arguably the best of the
  three answers, since it scoped the work to the two agreed steps. It parsed as
  no block, and because nothing parsed there was nothing to complain about, so
  the eval read a correct answer as the plugin never firing.

  *No block is not a violation* was always about a turn that wrote nothing —
  most turns, and the reason this plugin nudges rather than gates. It was never
  meant to cover a turn that wrote the marker and got the shape wrong. A marker
  that opens a line and yields no block now says so. Anchored to the line start
  on purpose: the marker named mid-sentence is prose, not an attempt.

  This does not raise the case's score, and is not meant to — a botched block
  fails either way. What it ends is the silence.
- **handoff 0.1.10 — a marker written as a list item is still a marker.**
  `- [HANDOFF]` with the fields hanging off it as sub-bullets: a complete
  block, `Status: needs-decision`, no violations at all once the two characters
  in front of the marker are removed. `BLOCK_RE` already tolerated heading
  hashes and emphasis; the bullet is the same kind of decoration, and the field
  parser already handled the indent that came with the nesting.

  One transcript in 51, which is the point: this is the fifth defect of the
  shape, and the first found by counting rather than by hitting it. Across 171
  transcripts the silent miss fired twice — once here, once in executive — and
  **not once** in coverage, epistemic or termination over 109. Those three are
  untouched. The hole exists in all five scanners by construction, since each
  defines its own `BLOCK_RE`; it is fixed where it was observed.
- **the eval harness stopped leaving a workspace behind on every invocation.**
  `scratchWorkspace()` created one per call and nothing ever removed them: 623
  directories had accumulated. Small — 21MB, and not what actually filled the
  disk when a run finally died of it — but a suite that leaves a directory
  behind every time it measures anything degrades the machine it runs on. It
  now sweeps its own, older than a day, best-effort, on the way past.
- **the dead-run guard missed the second outage.** Its pattern was the literal
  `spend limit`, written from the only sample there was, and the next notice
  said `session limit`: 77 of 78 transcripts went unrecognised and the run
  again reported 6 of 6 quiet cases costing nothing — the same false all-clear,
  from the guard built for exactly this.

  It now matches the family (`you've (hit|reached) your <x> limit`, and a
  notice ending in `· resets …`) and carries a length floor of 105 characters,
  which is the shortest real answer across every transcript this repository has
  collected. Both observed notices sit either side of it — 68 and about 160 —
  which is why neither length nor literal is sufficient alone. Every notice
  actually hit is now in `scripts/test.js` verbatim, to be added beside rather
  than replaced.

## [0.5.1] — 2026-09-20

One fix, for a defect that had been live through every release that shipped a
decorated marker. A bolded field name — `- **Status:** done` — parsed as a
field that was present and empty, so a correct close was graded as a block with
nothing in it. Worse than writing no block at all, because it produces a
retrospective accusing the close of leaving every field blank, and under a
strict gate it would block the stop.

| Plugin | Version |
|--------|---------|
| executive-self-monitoring | 1.4.1 |
| epistemic-self-monitoring | 0.1.10 |
| persistence-self-monitoring | 0.1.10 |
| termination-self-monitoring | 0.1.10 |
| coverage-self-monitoring | 0.1.10 |
| handoff-self-monitoring | 0.1.9 |

### Fixed
- **epistemic 0.1.10, handoff 0.1.9, termination 0.1.10, executive 1.4.1** — a
  bolded field name is the same field. The MARKER learned to accept decoration
  in 0.4.0; the field names never did, so `- **Status:** done` parsed as a field
  that was present and **empty**. That is a worse outcome than writing no block
  at all: a correct close drew a retrospective accusing it of leaving every
  field blank, and under a strict gate it would have blocked the stop.

  Found by writing one. The twelve eval cases reached 100% on both hosts
  without touching this, because those agents happened to write their fields
  plain — and this session's own closes, which bold them, had been drawing
  retrospectives all along. Emphasis is now allowed around the name with the
  colon inside it or outside, and stripped from a value that is wholly
  emphasised; emphasis *inside* a value is left alone.

  Three sites per scanner, not one, and the third was found by a corpus line
  rather than by the fix: `__Options__:` has no word boundary after `Options`
  because `_` is a word character, so the `**` form parsed and the `__` form
  did not, and the sub-items under a decorated `Options` were never collected —
  a correct fork read as *"fewer than two alternatives"*.

  coverage is untouched and stays at 0.1.10: its block's list items are part
  names rather than fixed labels, so there was no label to decorate.

  This is the fourth defect of one shape — the scanner refusing the discipline
  over formatting, after the coverage em-dash, the executive comma and the
  decorated marker. The pattern is now in `evals/PROTOCOL.md`.

## [0.5.0] — 2026-09-20

Every trigger in the collection was wrong, and in the same way. A load message
fires only when its condition can be read off the prompt as it arrives — not
off a close that does not exist yet, and not off the act a well-behaved agent
never performs. Five of the six were rewritten; one of them five times before
it held.

Underneath that, the eval grew the half it was missing. It asked only whether
the block appears when it is due, so six plugins injecting a reminder every
turn could reach perfect recall and still be unusable. Each plugin now also has
a turn where the block must stay away. And the runner refuses to score a run
that never reached the model, after an account limit turned forty dead
transcripts into results — reported, in the dangerous direction, as six perfect
precision scores.

All six plugins now reach 100% on both axes, on Claude Code and on Cursor. The
two hosts do not measure the same thing: Claude Code runs the hooks, Cursor
headless does not, so there the skill carries the discipline alone. Both reach
it.

| Plugin | Version |
|--------|---------|
| executive-self-monitoring | 1.4.0 |
| epistemic-self-monitoring | 0.1.9 |
| persistence-self-monitoring | 0.1.10 |
| termination-self-monitoring | 0.1.9 |
| coverage-self-monitoring | 0.1.10 |
| handoff-self-monitoring | 0.1.8 |

### Changed
- **all six plugins** — the injected load message is a pointer to the skill, not
  a paraphrase of it. It used to restate the protocol — write the ledger,
  hardest first, close each part — which made loading the skill look redundant
  while dropping the one thing the hooks actually read: the `- <part>: done`
  line shape. The agent did the discipline and wrote the block in whatever form
  came naturally, and the scanner refused it.

  Now the message carries only what the skill cannot know — that this session is
  measuring, and the trigger to watch for — and says
  **"load the <name> skill if it is not already loaded"**. `load` rather than
  `run`, because an agent loads instructions rather than executing them; the
  condition keeps a cadence injection from asking for the same load every turn.

  What is measured: the message is 38% shorter (3140 → 1959 characters across
  the five shared ones), and the agent does load the skill from the pointer —
  a stream trace shows the Skill tool invoked with the short name.

  > **Corrected in 0.6.0.** That last clause rested on a single stream trace.
  > Measured properly afterwards — executive's eval case, three configurations,
  > six runs each, with the Skill tool's own `PreToolUse` hook logging every
  > invocation — the skill loaded **0 times out of 18**, including six runs with
  > the skill available and no message at all. Under `claude -p` the pointer
  > does not produce a load. See `evals/PROTOCOL.md`, "The skill is not a lever
  > on Claude Code headless".

  What is NOT measured: any change in how often the block comes out. The same
  case, same n=3 and same configuration produced 100% and then 33% on
  consecutive runs, and a 95% interval at n=3 spans [6%, 79%] for a 1-of-3 —
  every rate here overlaps every other. The ablation itself is unaffected:
  the no-plugin arm scored 0 in every case of every run.

  The English example phrases stay: they are how an agent working in another
  language recognises the trigger, and they are what lets it decide whether the
  skill is worth loading.
- **three eval cases were replaced, because they were not measuring what they
  are named for.** Two of them only showed it on Cursor, where the CLI runs no
  hooks and the WITH arm is the skill alone:

  `epistemic/separates-observed-from-conjectured` scored 100% in **both** arms.
  Its `NOTES.md` had diagnosed this a while back and prescribed the fix: a
  deploy seven minutes before a latency jump is a textbook correlation trap, so
  well represented that a competent model reaches for the hedge unaided. It is
  now six flat days against three weeks of a daily leak, with the owner asking
  for a closing comment that confirms the fix — evidence that reads as proof,
  and a request to close the question rather than open it.

  `handoff/closes-with-a-decision` asked "Redis or SQS?", and the unaided
  baseline answered it with a well-formed `[HANDOFF]` block — Status, Options,
  `Default: A, because …`, `Next: Reply A or B` — in 2 runs of 3. That is
  simply the shape of a good answer to a which-of-these question. It is now a
  migration review with the decision buried inside it: take the booked window,
  or do it online in batches. The unguarded answer is prose about locking and
  backfill with the choice mentioned in passing, which is the failure this
  plugin exists for.

  `epistemic/stays-quiet-on-a-lookup` cost 33 points of precision, and reading
  the block showed the plugin was right and the case was wrong: asked for a
  PostgreSQL default with no way to verify it, the agent answered, marked the
  claim `Status: conjecture`, and gave a real falsifier. An unverified recall
  claim **is** a conjecture. The case now asks for a changelog entry to be
  reformatted, carrying the trigger vocabulary — root cause, flaky test, race —
  as data the agent is told not to change.

  Rewriting a case after it fails is how a measurement gets fitted to its
  desired answer, so the argument for each replacement is in its `case.json`
  and holds independently of the score.
- **handoff 0.1.8** — the trigger also covers a review of work the owner is
  about to run. On the harder prompt above it fell to 1 of 3, and this time the
  skill was checked first: its conditions already covered the turn (*a risk you
  did not take*, *the close is an offer*), so the gap was the message's, not the
  authority's. Adding *"look at this before I run it"* took it to 5 of 5.

  Five rewrites of one trigger, and they divide cleanly: four failed on the
  SHAPE of the condition (always true, self-excluding, not decidable on
  arrival) and this one on its COVERAGE.
- **the behavioural eval measures precision, not only recall.** Every case so
  far asked the same question — when the block is due, does it appear? Nothing
  asked the opposite, and six plugins each injecting a reminder every turn can
  reach perfect recall and still be unusable, because the cost lands on the
  turns that needed none of it. Executive's own message says "skip if this turn
  is trivial"; that sentence had never been measured.

  Each plugin now has a second case, `expect: "quiet"`, holding a turn that sits
  near its trigger without meeting it: one part rather than several, a lookup
  rather than a diagnosis, a first failure rather than a fourth, a turn that
  ends because it finished. A quiet case is graded on the MARKER and not on the
  scanner — a malformed block on a turn that needed no block is still noise —
  and it reports `cost` rather than `delta`, because it cannot beat a baseline
  that is silent for free.
- **the eval refuses to score a run that never reached the model.** The CLI
  writes its own failures to stdout in the same channel as a reply. A twelve-
  case run hit an account spend limit part way through: 40 of its 72
  transcripts were `You've hit your individual spend limit`, and all 40 were
  scored. Three plugins appeared to regress to zero, and — the dangerous half —
  every quiet case reported a pass, because an error message contains no block
  and a dead run cannot fail a silence test.

  `usable()` now drops those runs from the denominator instead, and a case
  whose arm has nothing left is printed as `NOT SCORED` rather than as a
  result. Its patterns match the shape of a CLI failure rather than its topic:
  a first draft matched a bare `rate limit` and the test caught it rejecting a
  real answer about backing off on a 429.
- **the Cursor runner no longer runs its child in the repository.** It passed no
  `cwd`, so the CLI - a `.cmd` shim on Windows, and a shell and PowerShell
  behind it - inherited whatever directory the runner was started from. Under
  `--isolate`, `HOME` and `USERPROFILE` point at a scratch directory, PowerShell
  rebuilt its data paths from that environment, and one of them resolved
  relative: `Microsoft/Windows/PowerShell/ModuleAnalysisCache` appeared in the
  repository root fifteen seconds into the first isolated run. The file is a
  regenerable cache and harmless; being untracked and not ignored, it was one
  `git add -A` away from a commit. The child now runs in its own workspace, and
  every other invocation in the temp directory.
- **`--rescore <dir>`** re-grades transcripts already on disk, with no calls and
  no cost. The grading core keeps changing — a scanner learns a separator, a
  guard learns to drop a dead run — and each change puts the previous numbers in
  question. This answers that for free, and has already paid for itself twice:
  the coverage case went from 1-of-3 to 3-of-3 on transcripts that were sitting
  there the whole time, and the spend-limit outage above was found by re-scoring
  rather than by re-running.
- **the case filter takes a comma-separated list**, and each term matches a
  plugin name or a case id, so a run can be narrowed to exactly the cases whose
  answer is still open.
- **executive 1.4.0** — the check block is `[PLAN CHECK]`, with named fields and
  a scanner that reads them. It was `[EXECUTIVE SELF-MONITORING]`, a marker no
  hook and no scanner ever read, and its three fields ran the answer into the
  label: `Active plan/gate` asked for an artifact, an objective and a gate on
  one line, and `Aligned?` invited a tick. The fields are now `Plan` (an
  artifact, named), `Gate` (quoted from it), `Drift` (`none`, or what is pulling
  away) and `Decision` (`continue | refocus | revise-plan`), which is the same
  five-step protocol with one answer per line.

  `lib/plan.js` checks that block the way the other four scanners check theirs:
  an artifact rather than a placeholder, a gate that is present, and `Drift` and
  `Decision` agreeing — nothing pulling away means the decision is `continue`.
  It matches no phrases, because drift is not a lexicon: *"while I was in there
  I also fixed the header parsing"* is drift in a branch scoped narrow and the
  right thing to say in one that is not, and only the plan tells them apart.

  Nothing gates on this. Executive has no `Stop` hook by design — it is the one
  plugin in the set that never blocks — so the block is written for the reader,
  and the scanner exists so the behavioural eval can score this plugin the way
  it scores the other five instead of skipping it for want of a judge model.

### Fixed
- **all five skills** — one rule above the block template: write the block, do
  not announce writing it. Observed once and precisely: a termination run opened
  with *"I loaded the termination-self-monitoring skill because …"* and then
  wrote the block's fields with no `[TERMINATION CHECK]` line at all — the
  narration had taken the marker's place, and a block whose marker is missing is
  not a block. One transcript of fifteen, so this is a rule for a named failure
  rather than a widespread one. It lives in the skills rather than the messages:
  it is static protocol content, and the messages are being kept to a trigger
  and a pointer.
- **coverage 0.1.10** — a part line may separate its name from its status with
  an em- or en-dash, not only a colon. Every run of the coverage eval case
  enumerated all three parts and closed each one; the runs the scanner rejected
  differed from the run it accepted only in writing `- enqueue(item) — done`
  where it wanted `- enqueue(item): done`. Re-scoring the three transcripts
  already on disk turns 1 of 3 into 3 of 3, with no new run. `blocked` and
  `returned` still require the reason after them.
- **persistence 0.1.9 and handoff 0.1.8** — both load messages triggered on the
  act that goes wrong, and so excluded the agent that does not commit it. This
  took two passes to see, because the first rewrite of each looked like a fix
  and reproduced the same error one level down.

  Persistence first triggered on *"when a nudge arrives with a count"* — the
  counts are 4 edits, 3 failed runs or 30 tool calls, so a turn reaching none of
  them is told the skill does not apply. Rewritten to *"before trying again
  after something already failed"*, it still scored 0 of 3: every run read the
  four failed attempts, named the layer they shared, and **decided not to try
  again**, which is the behaviour the plugin exists to produce. There was no
  trying again, so the trigger never fired.

  Handoff first triggered on *"before you close a turn"*, which is every turn
  and singles out nothing. Rewritten to *"when your close would leave them a
  choice"*, it also stayed at 0 of 3: two runs closed by deciding — *"I'd stay
  on Redis"* — leaving no choice, on the case named `closes-with-a-decision`.

  Both triggers now name the situation the turn arrives in, which holds whether
  or not the agent goes wrong: for persistence, something has already failed
  more than once, whichever way the next move goes; for handoff, a close that
  carries a decision, one made for the reader or left to them.

  Handoff needed a third pass, and it is the one that explains the other two.
  *"When your close carries a decision"* scored 1 of 4: the runs recommended a
  transport, one ended on a question to the reader, and still no block. Every
  version of this trigger asked about **the close** — and the message is
  injected at `UserPromptSubmit`, when the close does not exist yet. A trigger
  the agent cannot evaluate at the moment it arrives cannot fire.

  That is what the four working triggers have in common, and it was not visible
  until this one failed three ways: a multi-part task, a diagnosis, an attempt
  that already failed, an instruction to stop — each is readable off the prompt
  as it lands. Handoff now asks the same kind of question: is this an ask they
  will act on rather than just read. It also means the first diagnosis here
  — *always true, so it singles out nothing* — is no longer the best
  explanation of the original failure.

  Scope, in both cases: the load message is the only lever the eval exercises.
  Handoff's `Stop` gate is opt-in and off (`HANDMON_STRICT`) and its pre-close
  needs a green gate or a commit; persistence has no gate at all — its `Stop`
  only records — and its nudge needs counts a single-answer turn never reaches.
- **persistence 0.1.10** — the skill excluded the situation it exists for. Its
  four activation conditions were a hook count, *you* about to retry, *your*
  quick fix growing, *you* fighting the tooling — every one about the agent's
  own loop. None covered the commonest shape of all: the owner arrives already
  in the loop, pastes four attempts that failed the same way, and asks what is
  next. The agent loaded the skill, read that this was not about it, and
  correctly wrote no block. Measured at 0 of 3 with answers that were otherwise
  exactly right — one of them literally answering *"why this is different from
  the other four"*, which is the protocol's own question. Adding the owner's
  loop to the conditions, and saying that `Attempts` counts attempts made
  rather than attempts the agent made, took it to 2 of 3.

  Worth naming plainly: this trigger was rewritten twice **in the message**
  before anyone opened the skill. The message is a pointer now, so the skill is
  the authority, and the authority was the copy that said "not you".

  The remaining run opened with *"I can't reach the web from here"* and went
  straight to the answer. A caveat about the environment is worth making - it
  tells the reader what could not be verified - but placed first it takes the
  block's position, so the skill now says it goes below.
- **executive 1.4.0, handoff 0.1.8, termination 0.1.9** — a block field may
  carry a qualifier after a comma, not only after a dash, colon or bracket.
  Executive wrote `Decision: continue, scoped strictly to steps 1-2` and
  `Decision: continue, explicitly excluding the noticed but out-of-scope
  fixes` - two correct blocks of three, scored as malformed for their
  punctuation. Same shape as the coverage em-dash defect. Handoff's `Status`
  and termination's `Reason` had the identical rule and are fixed with it,
  before it reaches them.

  This is the second time a scanner has rejected the discipline over a
  separator, so the general form is worth stating: the token is checked by
  what FOLLOWS it being punctuation rather than more letters, which is what
  keeps `revise-plan` from matching as a qualified `revise`.
- **`evals/corpus/plan-close.jsonl`** — `lib/plan.js` was the only close scanner
  with no corpus, which is how it shipped with the separator defect above and
  full unit tests at the same time. Sixteen lines, several transcribed from the
  eval transcripts rather than invented — including the two comma-qualified
  decisions, so the next widening of that rule cannot quietly undo this one.
  A corpus is where the shapes agents actually write accumulate; a unit test is
  only where the shapes their author thought of do.
- **termination 0.1.9** — the skill now says the `[TERMINATION CHECK]` line
  opens the block, always. The no-narration rule below cut the announced-load
  variant, and the failure came back without the announcement: a run wrote a
  paragraph of analysis and then started the list straight at `- Trigger:`, with
  all four fields correct and no marker above them. Four fields with no marker
  are prose, and the scanner and hooks read that turn as one that never ran the
  check. Measured at 2 of 3 with the rule as it stood.
- **coverage 0.1.8, epistemic 0.1.8, termination 0.1.8, handoff 0.1.6** — the
  four close scanners now recognise a block whose marker the agent decorated:
  `**[COVERAGE CHECK]**`, `## [HANDOFF]`, `**[TERMINATION CHECK]:**`. They
  required the marker bare on its line, and an agent writing markdown reaches
  for `**` on its own — so a correctly closed turn read as no block at all.
  The cost was not cosmetic: a closed ledger still drew a retrospective
  accusing the agent of not closing it, and under `EPIMON_STRICT`,
  `TERMMON_STRICT` or `HANDMON_STRICT` a well-formed block could still block
  the stop. Backticks stay out of the allowed decorations, so a marker quoted
  in inline code remains documentation rather than a closure.

  Found by the Claude Code behavioural eval, not by review: the agent wrote
  `**[COVERAGE LEDGER]**` unprompted and the case scored 0, which looked like
  the plugin doing nothing until the transcript showed otherwise.
- **coverage 0.1.9, termination 0.1.9, handoff 0.1.7** — a FENCED example of a
  protocol block is no longer read as a declared block. epistemic got this
  earlier and the other three were left behind, so documenting the format —
  which is what an instruction that teaches it does — produced violations about
  a template: two for termination, three for handoff, and under a strict gate a
  blocked stop for explaining the format. It fired on this repository's own
  messages while the fix was being written.
- **all five stateful plugins** — `LOCK_WAIT_MS` goes from 250 ms to 1500 ms.
  250 was sized against a 16-call burst measured at ~130 ms, under 2x margin,
  and a loaded machine spends it: the same burst counted **5 of 8** parallel
  tool calls, because every process gave up on the lock and raced. The deadline
  is only ever spent under real contention, so an uncontended update is
  unaffected. Measured, not guessed — 250 ms lost increments repeatedly, 3000 ms
  did not, and 1500 ms held 8/8 across five bursts.

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
- a CHANGELOG check in the suite: every version named inside a release's
  entries must match that release's version table, and while nothing is queued
  under *Unreleased* the table must match the manifests too (once something is
  queued, the manifests are ahead on purpose, and a manifest may only never
  fall behind). Those labels drifted three times while this release was being
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

[Unreleased]: https://github.com/3dgiordano/agent-plugins/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.6.0
[0.5.1]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.5.1
[0.5.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.5.0
[0.4.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.4.0
[0.3.1]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.3.1
[0.3.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.3.0
[0.2.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.2.0
[0.1.0]: https://github.com/3dgiordano/agent-plugins/releases/tag/v0.1.0
