# Pre-registration B: real blocks

Written 2026-10-03, before any reader ran on real sessions. Readers are **Claude models only**: the transcripts already went through Anthropic, and no other provider receives them. Methods: the block-against-close reading of A (PREREG-A.md) and the triage reading validated in A2-A3 (PREREG-A2.md, RESULTS-A3.md).

## Material

Real development transcripts, every assistant message with a `[HANDOFF]` block, deduplicated by block text, leaving out the session running this study; all written under handoff 0.4.0 or earlier (no `waiting` status existed then). The transcripts are not versioned.

**Truth, where it is known.** The transcripts record each command started in the background ("running in background with ID") and each completion notice (`<task-id>`/`<status>`). A block written while a started task had not yet reported, whose task did report later in the same session, was written while something was still running: its truth for f2 ("anything still to come") is **yes**. Counted before any reading (`fidelity.js` `sessionBlocks`): the blocks with that truth, split by status (`done` or `needs-decision`); blocks whose task never reported get no truth; the rest had no task out.

**Sample read**: every block with truth, and a random draw of the blocks with no task out (`makeSessions`, seed recorded). Views: triage (Status and Next lines), block, full message. Readers: Sonnet 5, Opus 5, Opus 5.5 High, one pass, isolated as before (no tools, no plugin, empty directory, stream audited). Items stay under `evals/results/` (not versioned).

## Measures and predictions

| | Prediction (from A, A2) | Contradicted when |
| --- | --- | --- |
| R1 triage | of the triage readings of the `done` blocks written while a task ran, most (at least half) read that nothing is still to come (f2 no or can't tell) | fewer than half |
| R2 block | the whole-block reading of the same blocks sees the running task more often than the triage reading does | not more often |
| R3 caveats | where the full message carries a risk or caveat (f7 yes), the block reading misses it in at least 30% of readings | under 30% |

Described without prediction: the `needs-decision` blocks with truth; contradiction and omission per question for every item (block against full); block-to-message compression.

What R1 and R2 together would say: in real sessions, the status line most likely to be read first said the work was done while a run the user had started was still going, and the rest of the block or message carried the correction - the pattern 0.5.0 named and 0.5.1 fixed in its Next line.

## Known limits

- Not committed before the run; every reader pass stores this file's SHA-256.
- A background task is not always what the result depends on (a server left running, a monitor); the truth says something was running, not that it mattered. The `done` blocks with truth are read as an upper bound on misleading closes.
- The sessions all ran with every plugin installed.
- Claude readers only; no cross-family check here.

## Deviation (2026-10-03, before any result was read)

Three readers on every item were judged too large a run, and a smaller one was chosen. The three readers were stopped (their partial output not used). What is run instead answers R1 and R2 only: the `done` blocks written while a task ran, in the triage and block views, read by Sonnet 5 alone (`evals/results/fidelity-B-small`). R3 is not measured on real sessions; the caveat finding stands on A (30 of 30 readings of the finished case). With one reader the result is descriptive.
