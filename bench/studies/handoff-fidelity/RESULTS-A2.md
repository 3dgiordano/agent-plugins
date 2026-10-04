# Results A2: the triage reading (2026-10-03)

As pre-registered (PREREG-A2.md, SHA-256 bd57d945..., stored in every reader pass). The 23 closes of A, read once each by six readers seeing only the block's Status and Next lines: 138 readings, none excluded. Scores: `node scripts/fidelity.js --score-triage evals/results/fidelity-A2 --base evals/results/fidelity-A` (`score-prereg.txt`).

## The pre-registered verdict

| | Prediction | Result | Verdict |
| --- | --- | --- | --- |
| V2 | known failures wrong on f1/f2 in at least half; 0.5.0 (with truth) in at most 10% | known failures **14 of 18** (78%); 0.5.0 **36 of 90** (40%) | **contradicted** on the 0.5.0 side |
| C | known failures inconsistent with the whole-block reading in at least half; 0.5.0 in at most 10% | known **13 of 18** (72%); 0.5.0 **24 of 90** (27%) | **contradicted** on the 0.5.0 side |

The triage reading does catch the misleading 0.4.0 status - `Status: done` / `Next: nothing` is read as finished in 14 of 18 readings, where the whole block was read right in 14 of 18. But it also finds 0.5.0 blocks misread, which the prediction said it would not.

## Where the 0.5.0 misreadings are (exploratory, read after scoring)

None in the Done case (`Status: done` / `Next: nothing`: 0 of 30 wrong) and the decision case has no truth. All 36 are Result-out blocks - `Status: waiting` - and they split on how Next is written:

| Next line of a `waiting` block | Readings | Read that something is still to come (f2 yes) |
| --- | --- | --- |
| `Next: nothing` (bare, or `nothing.`) | 42 | 6 |
| `Next: nothing.` followed by a sentence (`I'll report back when the import finishes`, `if you'd rather not roll back ... tell me before it finishes`) | 18 | 17 |

A reader who looks at the status and the next step alone does not take `waiting` with a bare `Next: nothing` to mean a run is still going: most answered that nothing is still to come, or could not tell. The line that says what is out, `Waiting-on`, is not one of the two lines a person reads first. This is the failure the owner reported at the start - a `Next: nothing` that reads as finished while a result is out - and handoff 0.5.0 fixed it in the Status word but not in the Next line.

Two readings of the same numbers, not separated here:

1. **The plugin's triage lines mislead** when waiting: 0.5.0 asks for `Next: nothing` when the result comes back to the agent (SKILL.md, protocol point 4), and that word, read with the status, says finished.
2. **The triage rule is too narrow for `waiting`**: if the status is `waiting`, the line that carries it (`Waiting-on`) belongs with what is read first. Widening the rule after seeing the result would fit the measure to the plugin, so it is not done here.

## What it means for the method

The triage reading separates a misleading status from a faithful one where the status and next lines carry the state (0.4.0's `done` against 0.5.0's `done`), and it is sensitive enough to find a weakness nobody had named in 0.5.0. Whether it is "validated" depends on which reading above is right, which a change to the plugin can decide: write the wait into Next ("nothing until imp-... reports, about 30 minutes") and the triage misreadings should fall. That is a prediction for a run, not something this data can settle.
