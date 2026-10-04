# Results A: the block read against its close (2026-10-02)

As pre-registered (PREREG-A.md, SHA-256 22cf5c42..., stored in every reader pass). 23 closes - 20 handoff 0.5.0 blocks, 3 known failures (0.4.0) - each read twice (the block alone; the whole close) by six readers: 276 readings, none excluded. Scores: `node scripts/fidelity.js --score evals/results/fidelity-A` (`score-prereg.txt` beside them).

## The pre-registered verdict

| | Prediction | Result | Verdict |
| --- | --- | --- | --- |
| V (method) | known-failure blocks read wrong on f1/f2 in most readings; 0.5.0 blocks in at most 10% | known failures **4 of 18** (22%); 0.5.0 blocks 0 of 120 | **contradicted**: the method does not separate a misleading block from a faithful one |
| H1, H2, H3 | - | - | not interpreted, as the pre-registration says when V fails |

Why V fails, read in the 18 known-failure readings: each 0.4.0 block says `Status: done` and, in its Situation line, that the import is about 30 minutes from finishing. A careful reader reads both lines and resolves the conflict in favour of the Situation, which is right; 14 of 18 readings did. The defect a person meets - triaging on the status word, as the skill itself says the reader does - is not one a reader of the whole block meets. The method measures whether the truth can be got out of the block, not whether the block misleads the reader who looks at its status first.

## Described, not interpreted

For the 0.5.0 blocks (120 paired readings):

- **Concision**: median block 78 words against 243 for the close (0.28).
- **Contradiction**: 5 of 120 readings, all in `closes-with-a-decision` (a review whose "finished" and "still to come" are ambiguous by nature).
- **Omission**, what a reader of the close found that a reader of the block did not:

| Case | Readings with an omission | Which |
| --- | --- | --- |
| Done | 30 of 30 | a caveat (f7) every time - the seven rejected rows will be left out of the real import - and an optional choice (f4) in 7 |
| Result out, short | 7 of 30 | next action (f6) 5, caveat 2, recommendation 1 |
| Result out, long | 9 of 30 | caveat 6, next action 2, recommendation 1 |
| Decision | 3 of 30 | next action 3 |

The caveat is the one thing the blocks leave out systematically: the skill asks for one sentence of Situation, and the warning the close carries ("these 7 customers will not be imported", "rollback.js removes the whole file") stays in the text above.

## Real sessions (B, concision only, computed locally)

286 distinct blocks from 16 sessions in the owner's transcripts (this session's included): median block 102 words against 481 for the message (0.21; 10th-90th percentile 0.11-0.36); reading time 26 s against 121 s at 238 words a minute. `done` blocks compress most (0.14), `needs-decision` least (0.25).

## Next

A triage view: the reader sees only the block's Status and Next lines - what a person reads first, by the skill's own design - and answers f1, f2, f3, f6. Prediction to pre-register: the 0.4.0 blocks are misread there (`done` read as finished) and the 0.5.0 blocks are not; the block's internal consistency is then the agreement between its triage reading and its full reading.
