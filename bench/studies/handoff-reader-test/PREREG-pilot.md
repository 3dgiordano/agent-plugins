# Pre-registration: the reader-test pilot

Written 2026-10-02, before the long runs were made and before any reader ran. Design: [DESIGN.md](DESIGN.md) (its pilot section and its review). The question is the owner's: **can the theory behind the design be wrong here?** - so every prediction below states what contradicts it.

## Closes

All written by Opus 5.5 High on Claude Code 2.1.283, handoff 0.5.0 against no plugin, through `scripts/claude-eval.js` with the widened shell grant and the streams kept.

| Situation | Length | Source | Per arm |
| --- | --- | --- | --- |
| Result out | short | `closes-while-a-run-is-out`, the runs of `evals/results/claude-opus-5.5-high-2026-10-02T20-30-26-963Z` (made for the second judge pilot, before this design existed) | 5 |
| Result out | long | `closes-while-a-run-is-out-long`: the same repository and last request after three earlier turns of work in the same session; new runs, made after this file | 5 |
| Done | short | `closes-a-run-that-finished`, the same directory as the short Result-out runs | 5 |

A run whose stream does not show its case's premise is left out with the reason (`left-out.json`).

## Readers and items

The six-model panel - Sonnet 5, Opus 5, Opus 5.5 High (`claude-judge.js`), Composer 2.5, Grok 4.6 High, Grok 4.7 High (`cursor-judge.js`) - one pass, isolated as for the judges, each reading every item once. Items are built by `scripts/reader-test.js --make`:

- **close**: the last request and the close (30);
- **upper**: the same plus a compact trace of what the agent ran, for every Result-out close (20);
- **lower**: the request alone, one per case (3).

Questions and their keys: `scripts/judgelib.js` `READER_QUESTIONS`; keys computed per run from its stream (`reader-test.js` `keysOf`). A reading with a tool call, a read outside its directories or no readable answer is not counted.

## Outcomes

A reading is **correct** when q1, q2, q3 and q5 all match the key. Reported per cell (situation, length, arm), over the readings of the five readers that are not Opus 5.5; Opus 5.5 reading its own model's closes is reported apart. Also: **false closure** (the reader says finished, or nothing still to come, while a run is out or the owner has something to do), **false pending** (the reverse), **can't tell**, and each question alone.

## Predictions and what contradicts them

Rates are the share of correct readings in a cell (25 readings at most: 5 closes × 5 readers).

| | Prediction | Contradicted when |
| --- | --- | --- |
| I1 | The upper bound is read correctly in at least 90% of readings | below 90% - then the questions or the keys are wrong, and P1-P3 are not interpreted |
| I2 | The lower bound is not read correctly by most readers | correct in more than half of its readings - the questions give their answers away, and P1-P3 are not interpreted |
| P1 distance | Without the plugin, long Result-out closes are read correctly less often than short ones | the long rate is equal to or above the short rate |
| P2 format | In Result out, long version, closes with the plugin are read correctly more often than closes without | the with-plugin rate is equal to or below the without rate |
| P3 no harm | In Done, closes with the plugin are read correctly at least as often as closes without, with no more false pendings | the with-plugin rate is more than 10 points below, or it has more false pendings |

Also reported, not a prediction: whether both arms sit at or above 95% correct in every cell. That is a **ceiling**: on this writer the theory's effect cannot show here, which for a pilot meant to find out whether the theory is wrong counts against it as much as a reversal would - the predicted difficulty is not there to be fixed.

With at most 25 readings per cell and closes as the real unit (5 per cell), these are directions, not tests: a contradiction or a ceiling is a finding; agreement with a prediction is a reason to run the study, not evidence for the theory.

## Known limits

- Not committed before the run (the agent does not commit); each reader pass stores this file's SHA-256.
- The short runs were made before this design and read by the person running it (as judge-pilot material); the long runs were not.
- One writer model; the theory predicts more for weaker writers, which this pilot does not test.
- Model readers read carefully and literally; a person in a hurry may read differently.
- The reader of a long session sees only the last request and the close.
