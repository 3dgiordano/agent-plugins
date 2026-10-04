# Pre-registration A2: the triage reading

Written 2026-10-02, after RESULTS-A.md and before any triage reader ran. A showed that a reader of the whole block resolves a wrong status word from the lines around it - 14 of 18 readings of the known failures were right - so it cannot see the failure a person meets when they decide on the status, as the skill says its reader does ("one word the reader triages on"). A2 fixes what is read instead of modelling a tired reader: the **triage reading** shows only the block's Status and Next lines, as written (`scripts/fidelity.js` `triageOf`), and asks the same questions (`FIDELITY_QUESTIONS`).

## Closes and readers

The 23 closes of A, unchanged (20 handoff 0.5.0 blocks, 3 known failures from 0.4.0), each read once in the triage view by the same six readers, isolated as before. The block and full readings of A are reused, not run again.

## Measures

- **Triage wrong**: against the run's truth on f1 (finished) or f2 (still to come), where the truth is known (the 15 Result-out and Done closes, the 3 known failures).
- **Inconsistency**: the triage reading and the same reader's whole-block reading are both definite on f1 or f2 and differ - the status line says one thing and the block another.
- Reported beside them: f3 and f6 from the triage view, and the decision case's triage-block disagreement (no truth there).

## Predictions, and what contradicts them

| | Prediction | Contradicted when |
| --- | --- | --- |
| V2 (method) | the known failures' triage readings are wrong on f1 or f2 in at least half of the readings, and the 0.5.0 blocks' (with truth) in at most 10% | known failures under half, or 0.5.0 over 10% - the triage reading does not separate a misleading status from a faithful one |
| C | the known failures are inconsistent (triage against block) in at least half of the readings, the 0.5.0 blocks in at most 10% | either side not met |

If V2 holds, the triage reading is the measure B applies to the owner's sessions: how often the status and next lines alone would tell the owner something the block, or the message, does not.

## Known limits

- Not committed before the run; every reader pass stores this file's SHA-256.
- "What is read first" is a rule (the Status and Next lines), not a measurement of a person; it follows the skill's own design, so it measures the plugin by its own claim.
- Three known failures; a validation on more needs more of them (the owner's sessions hold seven `done` blocks written while a run was out).
