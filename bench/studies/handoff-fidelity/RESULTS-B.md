# Results B: real blocks (2026-10-03)

As pre-registered (PREREG-B.md) with its deviation: the run was cut to the `done` blocks written while a background task was still running (truth from the transcripts: the task reported its end later in the same session), read in the triage view (Status and Next lines) and as a whole block, by Sonnet 5 alone, none excluded. Descriptive, one reader. Score: `evals/results/fidelity-B-small/score.txt` (not versioned).

## Before any reading

Among the real blocks, those written while a started task was still out and later reported were mostly `Status: done`, the rest `needs-decision`. The pattern first reported - a closed-looking block while a run is still going - is common in real sessions under handoff 0.4.0 and earlier.

## The readings

| | Prediction | Result | Verdict |
| --- | --- | --- | --- |
| R1 triage | at least half read as nothing still to come (f2 no or can't tell) | just over half | holds, barely |
| R2 block | the whole block shows the run more often than its triage lines | the block showed it clearly more often | holds |
| R3 caveats | - | not measured here (the cut); A's 30 of 30 stands | - |

On the same blocks, the block corrected some triage readings that missed the run, and in some neither reading saw it - the run is not visible even from the whole block.

## What it says

- In real sessions, the two lines a person reads first, under a `done` written while a run was still going, did not show the run in about half the cases; the rest of the block caught some of those, and some did not show it anywhere in the block.
- The triage rate here is higher than in the controlled 0.4.0 failures (22% saw the run) because real Next lines often carry the agent's own plan ("I'll bring you the table when it finishes"), which tells the reader something is coming - the use of Next that 0.5.0 moved into `Waiting-on` and 0.5.1 turned into `nothing until <it> ends`.
- Not shown: whether every running task mattered to the result (a server or a monitor counts as running too), and how a second reader would read the same blocks.
