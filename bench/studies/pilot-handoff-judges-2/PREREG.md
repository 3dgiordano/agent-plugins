# Pre-registration: judge panel pilot, second set

Written 2026-10-02, while the transcripts were being generated and before the sheet was built or any judge ran. Protocol: [docs/STUDY-PROTOCOL.md](../../../docs/STUDY-PROTOCOL.md). It replaces the first pilot (`../pilot-handoff-judges/`), whose sheet was not labelled: reading it found defects in the cases and the eval environment (its INTERIM.md, "Read before labelling"). Like the first, this pilots the **instrument**, not the plugin.

## What changed since the first set, and why

| Defect found | Change |
| --- | --- |
| The eval granted `Bash(node *)` only; compound commands (`node ...; echo "EXIT=$?"`, `cd ... && node ...`) were denied | `scripts/claude-eval.js` grants `cd`, `echo`, `ls`, `cat`, `head`, `tail`, `wc`, `grep`, `pwd` beside `node`; two replays of the control case: 0 denials, the dry run ran |
| Only the final text was kept | the eval keeps every run's stream (`<base>.stream.jsonl`) |
| A criterion stated the trajectory as a fact | each case states its **premise** in `case.json`; a run whose stream does not show it is left out of the sheet (`scripts/blind-labels.js`, `left-out.json`), not graded |
| The waiting case's result was known before the wait | the store refuses rows during the load (emails another customer has): 7 rows fail the file rules up front (0.23%), 11 more are refused while loading, the report says 0.60% and the rule says roll back |
| The decision criterion was the plugin's format | all three criteria are rubrics of yes/no questions about what the reply tells its reader, with a stated PASS rule; layout counts neither way |
| Blinding left the arm visible and changed the stimulus | replies are shown verbatim; the sheet says a block can hint at the arm. Blinding of the arm is not claimed |
| The set mixed plugin versions | one run directory, one plugin version (handoff 0.5.0), one model |
| `rollback.js` removed the whole store; an email named a customer id | the rollback removes only its job's rows; emails are not derived from ids |

## Inputs

- **Runs**: `node scripts/claude-eval.js closes-while-a-run-is-out,closes-a-run-that-finished,closes-with-a-decision --runs 5 --model opus-5.5-high`, started after the fixture fix below: 30 runs, 5 per case and arm, handoff 0.5.0, Claude Code 2.1.283.
- **Sheet**: `node scripts/blind-labels.js --make` on that run directory, verbatim replies, runs failing their premise left out. Its hashes are added below, under "Inputs as built", before any judge runs.
- **Criteria** (body SHA-256): reader-knows-what-is-out.md 4cc164bababb303ea686c8779e2c3111a6ea0368f0dbc4883ee148a142498605; reader-has-the-result.md a6bee74f6f5b63f4fb5f89ea50e50d4e9d9abd29d1a35897352e4cbf49455eb1; reader-can-act.md ee18ca404de6669f68629570f2befedc9de86a7d7d35605c12ff0ef51087d2d9.
- **Prompt**: `scripts/judgelib.js` `TEMPLATE`, 1cfb94fc725b6545a4f047ef9efe0c6c9bcc2056408ac18588fc07e038adf072 (unchanged).
- **Fixtures of the waiting case** (first 16 hex of SHA-256): run-import.js 97a4e4e8407e7bf0, store.js aa991d410e117a89, validate.js 34b1f808711343f1, rollback.js 4f891384902436c1, flag.js 64bf878796fe70fb, staging/customers.ndjson 6dbc8f129490e244, data/customers-2026-03.csv 57b13e8148fb4624 (the same CSV in both run cases).

## Judges, exclusions, analysis

As in the first pre-registration: Sonnet 5, Opus 5, Opus 5.5 High (`claude-judge.js`), Composer 2.5, Grok 4.6 High, Grok 4.7 High (`cursor-judge.js`), two passes each, one invocation per item; a verdict with a tool call, a read outside, or no readable verdict is not counted. Reported: each judge against itself, Fleiss' and pairwise kappa, the majority, the split items; the adjudication sheet (every split item plus 10 unanimous at random, shuffled, not saying which) labelled by a person blind to the judges' verdicts, and every judge and the majority against those labels.

Per-arm pass rates are computed and reported **as description of the instrument only**, after the labels: this set was not designed to estimate the plugin's effect (five runs per cell, cases written by the plugin's author in the same session).

Decision rule (unchanged): a judge or the majority is a candidate grader for these criteria if its kappa against the human labels is at least 0.8 and its errors are not concentrated in one arm (at most one item's difference between arms in false passes or false fails).

## Known limits, before the run

- Not committed before the run (the agent does not commit); every judge pass stores this file's SHA-256.
- The arm is visible to raters wherever the plugin's block is in the reply.
- The cases, criteria and fixtures were written by the plugin's author, revised after reading the first set's replies - this second set is therefore development data for the instrument, not a held-out test of it.
- The waiting case's agent can still compute the store's refusals in advance by joining the two files (the probe's run with the plugin did, and called it a forecast).

## Inputs as built

Built 2026-10-02 from `evals/results/claude-opus-5.5-high-2026-10-02T20-30-26-963Z` (30 runs, every one with its stream) into `evals/results/pilot-handoff-labels-2/`: 30 items, 5 per case and arm, none left out.

| File | SHA-256 |
| --- | --- |
| sheet.md | c0a4517c777053e38c24dfcddf819c78b21e8b55f6213c320b4fca2264425602 |
| items.json | 88184b1cb428ca0bc73a942513b74a922642d4f44142a488a4bdec73d9a22aba |
| key.json | 508e0282b239770570a5d1a6f0fe3489c89e63bc5ece28aaa01a959884186aaf |
| seed.txt | 6320682c645e9e34a0ce610e776fce21d95b1accfb8a917983b6f3babcb6c07b |
| left-out.json | 37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570 |
