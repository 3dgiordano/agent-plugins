# Results B: the owner's real blocks (2026-10-03)

As pre-registered (PREREG-B.md) with its deviation: the owner cut the run to the 46 `done` blocks written while a background task was still running (truth from the transcripts: the task reported its end later in the same session), read in the triage view (Status and Next lines) and as a whole block, by Sonnet 5 alone - 92 readings, none excluded. Descriptive, one reader. Score: `evals/results/fidelity-B-small/score.txt`.

## Before any reading

Of the 263 real blocks (16 sessions, this one left out), 55 were written while a started task was still out and later reported; **46 of those say `Status: done`**, 9 `needs-decision`. The pattern the owner reported at the start - a closed-looking block while a run is still going - is common in their own sessions under handoff 0.4.0 and earlier.

## The readings

| | Prediction | Result | Verdict |
| --- | --- | --- | --- |
| R1 triage | at least half of the 46 read as nothing still to come (f2 no or can't tell) | **24 of 46** (52%): 9 no, 15 can't tell | holds, barely |
| R2 block | the whole block shows the run more often than its triage lines | block **33 of 46** (72%) against triage 22 of 46 (48%) | holds |
| R3 caveats | - | not measured here (the cut); A's 30 of 30 stands | - |

Cross-tab of the same 46: in 22 both readings saw the run; in 11 the block corrected a triage reading that did not; in 13 neither did - the run is not visible even from the whole block.

## What it says

- In the owner's own sessions, the two lines a person reads first, under a `done` written while a run was still going, did not show the run in about half the cases; the rest of the block caught some of those, and about one in four did not show it anywhere in the block.
- The triage rate here (48% saw the run) is higher than in the controlled 0.4.0 failures (22%) because real Next lines often carry the agent's own plan ("I'll bring you the table when it finishes"), which tells the reader something is coming - the use of Next that 0.5.0 moved into `Waiting-on` and 0.5.1 turned into `nothing until <it> ends`.
- Not shown: whether every running task mattered to the result (a server or a monitor counts as running too), and how a second reader would read the same 46.
