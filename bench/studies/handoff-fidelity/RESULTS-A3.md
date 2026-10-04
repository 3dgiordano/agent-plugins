# Results A3: the wait written into Next (2026-10-03)

As pre-registered (PREREG-A3.md, SHA-256 36253b6c..., stored in every reader pass), with the deviations in DEVIATIONS-A3.md (six runs lost to a CLI login notice were made again; one extra run is not used). 15 closes by Opus 5.5 High with handoff 0.5.1, the triage view (Status and Next lines only), six readers: 90 readings, none excluded. Score: `evals/results/fidelity-A3/score-prereg.txt`.

| | Prediction | Result | Verdict |
| --- | --- | --- | --- |
| P1 the fix | waiting cases: triage readings that take something to be still to come rise from 23 of 60 (0.5.0) to at least 90% | **60 of 60** (100%) | holds |
| P2 compliance | at least 9 of 10 waiting closes write the wait into Next | **10 of 10** (`nothing until the import ends / finishes`, some with the time) | holds |
| P3 no harm | Done control triage readings right on f1 and f2, at least 90% | **30 of 30** (`Status: done` / `Next: nothing`) | holds |

## What it says

- Read with the status and the next step alone - what the skill says a person reads first - a `waiting` block of handoff 0.5.0 told the reader that nothing was still to come in most readings (23 of 60 saw the run). With 0.5.1 writing the wait into Next, every one of 60 readings saw it, and a finished run kept reading as finished.
- So of A2's two readings, the first is supported: the misreadings came from the plugin's Next line, not from a triage rule too narrow for `waiting`.
- Taken with A2, the triage reading now separates three kinds of block in the direction a person would care about: 0.4.0's `done` over a running job (14 of 18 read as finished), 0.5.0's `waiting` + bare `nothing` (37 of 60 read as nothing to come), and 0.5.1's `waiting` + `nothing until ...` (0 of 60).

## What it does not say

- One writer (Opus 5.5) and five runs per case; the cases are the ones the change was designed on - this is development evidence for the fix, not a held-out test.
- The triage rule is a rule about what is read first, taken from the skill's own design, not a measurement of a person.
- It says nothing about the rest of the block (omissions such as the caveat, RESULTS-A.md), only about the two lines a person reads first.
