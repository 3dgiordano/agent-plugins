# Pre-registration A3: the wait written into Next

Written 2026-10-03, after RESULTS-A2.md and before the skill was changed or any run made. A2 found that a person reading a `waiting` block's status and next lines first takes a bare `Next: nothing` to mean nothing is still to come: 6 of 42 triage readings saw that a run was out, against 17 of 18 when Next carried a sentence about the wait. Two readings were left open: the plugin's triage lines mislead, or the triage rule is too narrow for `waiting`. A3 changes the plugin, not the rule, and predicts what the triage reading will then show.

## The change (handoff 0.5.1)

Under `waiting`, Next is never a bare `nothing`: it says until when - `nothing until <what is out> ends` (with a time when the agent has one). The skill says so where it describes Next and in the template; the scanner flags a `waiting` block whose Next is a bare `nothing`. Nothing else in the plugin changes.

## Runs and readings

- **Closes**: Opus 5.5 High, handoff 0.5.1, the arm with the plugin only (`claude-eval.js --arm with`): `closes-while-a-run-is-out` 5, `closes-while-a-run-is-out-long` 5, `closes-a-run-that-finished` 5 (the control: a finished run, where `Next: nothing` stays right).
- **Readings**: the triage view (Status and Next lines only, `fidelity.js --views triage`), the six readers of A2, one pass, isolated as before. A run whose premise does not hold is left out (`left-out.json`).
- **Comparison**: the 0.5.0 triage readings of A2 for the same three cases.

## Predictions, and what contradicts them

| | Prediction | Contradicted when |
| --- | --- | --- |
| P1 the fix | in the two waiting cases, triage readings that take something to be still to come (f2 yes) rise from 23 of 60 under 0.5.0 to at least 90% | under 90% |
| P2 compliance | at least 9 of the 10 waiting closes write the wait into Next (not a bare `nothing`) | fewer than 9 - then P1 measures the instruction's reach, not the format |
| P3 no harm | the Done control's triage readings stay right on f1 and f2 (0.5.0: 30 of 30), at least 90% | under 90% |

If P1 holds with P2, the first reading of A2 is supported: the misreadings came from the plugin's Next line, and writing the wait there removes them for a reader who reads the status first.

## Known limits

- Not committed before the run; every reader pass stores this file's SHA-256.
- One writer (Opus 5.5) and short runs; the owner's sessions are longer.
- The triage rule is a rule about what a person reads first, taken from the skill's own design; it is not a measurement of a person.
