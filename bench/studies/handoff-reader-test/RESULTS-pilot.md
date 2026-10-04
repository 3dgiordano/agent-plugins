# Results: the reader-test pilot (2026-10-02)

As pre-registered (PREREG-pilot.md, SHA-256 4346baf3..., stored in every reader pass), with the deviations in DEVIATIONS.md and the inputs in INPUTS.md. 30 closes by Opus 5.5 High, six readers, 318 readings; 3 not counted (Composer 2.5 made a tool call in ask mode). Scores: `node scripts/reader-test.js --score evals/results/reader-pilot` (`score-prereg.txt` beside the readings).

## The pre-registered analysis

Share of correct readings (q1, q2, q3, q5 all right), five readers that are not Opus 5.5:

| Situation | Without the plugin | With handoff 0.5.0 |
| --- | --- | --- |
| Result out, short | 96% (24/25) | 92% (23/25) |
| Result out, long | 96% (24/25) | 100% (25/25) |
| Done, short | 100% (25/25) | 100% (25/25) |

No false closure and no false pending in any cell. Opus 5.5 reading its own model's closes: 100% in every cell.

| | Prediction | Result | Verdict |
| --- | --- | --- | --- |
| I1 | upper bound at least 90% | short 92% (55/60), long 95% (57/60) | holds |
| I2 | lower bound correct in at most half its readings | 20%, 20%, 0% (most answers "can't tell") | holds |
| P1 distance | unaided long reads worse than unaided short | 96% and 96% | **contradicted** |
| P2 format | with the plugin ahead in the long version | 100% against 96%: one reading | not contradicted; one reading at the ceiling is not a difference |
| P3 no harm | Done no worse with the plugin, no more false pendings | 100% and 100%, no false pending | holds |
| Ceiling | both arms at or above 95% in every cell | every cell 92-100%; the one cell under 95% is the plugin's short | not strictly; within one reading of it |

## What the misses are (exploratory, read after scoring)

Every miss in a close is on q3 ("Do you have to do or decide something now?"). Read one by one, the closes those readers answered yes to offer the owner a real, optional choice - "if those email clashes are expected and you'd rather not roll back, tell me before it finishes", "delete the scratch flag first, or tell me to" - while the key, computed from the stream, said no (nothing blocks the work). The question mixes *must* and *may*; the readers were not wrong. The same mix explains why the upper bound is not higher. On q1, q2 and q5 - still running, finished, what has happened to the flag - every close in every cell was read correctly by every reader: 100%.

## What the pilot says about the theory

- **The difficulty the theory predicts is not there for this writer.** Opus 5.5's closes without the plugin, short or long, were read as right as its closes with it; no reader took a run that was out for a finished one, in either arm. P1 is contradicted, and with q3 set aside every cell is at the ceiling. The plugin cannot show an effect where the unaided close already reads correctly.
- **The failure the owner saw came from the plugin's earlier format.** In the owner's sessions the misleading closes were handoff blocks (`Status: done`, `Next: nothing` while a run was out, handoff 0.4.0); in this pilot no unaided close produced that misreading. Every one of the owner's sessions had the plugin installed, so whether the unaided close would have misled there is not known.

Rival explanations, not separated by this pilot:

1. **The long version did not build the distance the theory names.** Its three earlier turns are unrelated work; everything the reader needs is in the last turn, so the writer's long trace never held something the close had to transmit. A long version where the decision depends on what happened turns earlier would test the theory; this one did not.
2. **The writer is strong.** The theory predicts a larger effect for a weaker writer; Opus 5.5 is the strongest of the six.
3. **The readers are careful.** Model readers read every word; an owner reading in passing may not.

## Instrument findings

- The key, the questions and the bounds work: a reader with the trace is right 92-95%, a reader with the request alone is mostly "can't tell".
- q3 must separate what the owner *must* do from what the close *offers* them to decide, or be keyed from the close as well as the stream.
- Opus 5.5 computed the store's refusals in advance in most Result-out runs, in both arms, and still presented the outcome as pending the report.
