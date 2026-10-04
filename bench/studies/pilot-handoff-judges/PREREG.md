# Pre-registration: pilot of a judge panel for handoff's prose criteria

Written 2026-10-02, before any run of the panel. Protocol: [docs/STUDY-PROTOCOL.md](../../../docs/STUDY-PROTOCOL.md). This is a **pilot of the instrument**, not a study of the plugin: it asks whether judge models can grade handoff's written criteria consistently enough to be validated against a person. Nothing here is a claim that handoff helps.

## Question

1. Do six judge models from two families agree with themselves (two passes) and with each other on the 30 pilot items?
2. Does the direction of the with/without difference in pass rate stay the same whichever judge grades it?
3. Which items do the judges split on? Those, plus a random sample of unanimous ones, go to a person for blind labels; the judges are then scored against those labels.

## Inputs (frozen)

`evals/results/pilot-handoff-labels/` (not versioned; transcript text), built by `scripts/blind-labels.js --make` on 2026-10-02 from three stored eval sessions:

| File | SHA-256 |
| --- | --- |
| sheet.md | c236cf7f0aa09957aae1134dd0f29527a74b80c5d43a406b04e6e7e7658e08e5 |
| items.json | 3d716d71036df25493bc4283af4d1787b2ad950deb460e535c06084fbbd81dc1 |
| key.json | e104984a37c27c5d246768817b922820f195c90ff30c81f2a6c74aacbaafdadc |
| seed.txt | f51a274d14ffdfbeb401398c7a32553fbab0d9e02684fc7a6791bff7c4603029 |

30 items: `closes-while-a-run-is-out` 6 with / 6 without, `closes-a-run-that-finished` 6 / 6, `closes-with-a-decision` 3 / 3. Criteria (each case's scored `type: llm` grader):

| Criterion | SHA-256 |
| --- | --- |
| closes-a-run-that-finished/graders/reader-has-the-result.md (body) | 158db9892407ff43390baa9c372445cc4482c6ea5f0bd463a1a67100a50bb826 |
| closes-while-a-run-is-out/graders/reader-knows-what-is-out.md (body) | 249bc1f16f472eb549cd3dea28ae1d5132c6bd71de7a226871ce0607bbf2071b |
| closes-with-a-decision/graders/reader-can-act.md (body) | 0eb4511e1b28e06311003087e2c6344d5e7ef0bdc34a91c6fc2648dde526c950 |

Prompt: `scripts/judgelib.js` `TEMPLATE`, SHA-256 1cfb94fc725b6545a4f047ef9efe0c6c9bcc2056408ac18588fc07e038adf072. Repository at `06dd34d` plus the working tree of 2026-10-02.

## Judges

Two passes each, every item in its own invocation (so item order cannot carry over):

| Host | Rows of bench/suite.json | Driver and isolation |
| --- | --- | --- |
| Claude Code 2.1.283 | `sonnet-5-high`, `opus-5-high`, `opus-5.5-high` | `scripts/claude-judge.js`: `--restricted --strict-mcp-config --tools ""`, dontAsk, allowlisted environment, a TEMP and an empty directory per item |
| Cursor Agent 2026.10.01-14929f9 | `composer-2.5`, `cursor-grok-4.6-high`, `grok-4.7-high` | `scripts/cursor-judge.js`: scratch HOME per item, `--mode ask`, empty workspace and directory |

Each pass is stored as `judges/<model>__pass<k>.json` with a `.run.json` recording this file's hash.

## Exclusions

An item's verdict from one pass is not counted when the answer has no readable verdict, when the judge made a tool call, or when the audit finds a read outside its directories. Counts are reported per judge and pass. A judge whose pass loses more than 3 of 30 items is reported, and kept out of the panel statistics.

## Analysis

- Per judge and pass: pass rate per arm, Wilson 95%.
- Per judge: agreement and Cohen's kappa between its two passes.
- Across judges, first pass: Fleiss' kappa; Cohen's kappa for each pair.
- Majority over every counted vote per item (a tie is unsure); its pass rate per arm.
- Split items: any item whose counted votes are not unanimous.
- Adjudication: every split item plus 10 unanimous items drawn from a recorded seed (`scripts/blind-labels.js --adjudicate`), in one shuffled sheet that does not say which is which. Labelled by a person blind to the arm and to the judges' verdicts.
- Against the human labels: each judge's and the majority's agreement and kappa, and false passes and false fails per arm.

Decision rule for the instrument (what the pilot can conclude): a judge, or the majority, is a **candidate** grader for these criteria if its kappa against the human labels is at least 0.8 and its errors are not concentrated in one arm (no more than one item's difference between arms in false passes or false fails). With about 15 to 20 labelled items this is a screen, not a validation; validation needs the larger labelled set the protocol asks for.

## Known limits, stated before the run

- **The pre-registration is not committed before the run.** The agent that prepared it does not commit (the owner does). Every `.run.json` stores this file's SHA-256, so a later edit is visible; the commit will follow the runs.
- **The items' author is not blind.** The items, the criteria and the cases were written in the same session by the agent that also read some of these transcripts knowing their arm. The person who labels should be someone who has not seen them; if it is the owner, who saw excerpts in that session, the report says so.
- **Blinding of the replies is partial**: plugin markers and field labels are removed, the content kept; the layout of a list can still hint at the arm.
- **A first Sonnet 5 pass** (`judge.json`, renamed `judge-prepanel.json`) was run before this file, with weaker isolation (plugins switched off by settings, not `--restricted`). It is not part of the panel; its verdicts were not read.
- **Opus 5.5 wrote these replies**, so its verdicts may favour its own style; the Cursor judges are the check on that.
