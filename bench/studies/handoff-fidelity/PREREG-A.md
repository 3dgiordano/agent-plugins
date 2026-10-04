# Pre-registration: the handoff block as a summary for deciding (A, controlled runs)

Written 2026-10-02, before any reader ran. Owner's framing (2026-10-02): the owner reads the `[HANDOFF]` block, and the text above it is there for when they doubt; so the block carries the cost of deciding, and its quality is that **nothing the owner needs escapes it and nothing in it is read otherwise** than the close it summarizes. A, on controlled eval runs, validates the method; B applies it to the owner's own sessions.

## Method and its sources

The block is judged as a summary of the close, by asking a reader the same questions from the block alone and from the whole close, and comparing the answers. The idea is taken from question-answering evaluation of summaries:

- Wang, A., Cho, K., Lewis, M. (2020). *Asking and Answering Questions to Evaluate the Factual Consistency of Summaries.* Proceedings of ACL 2020, 5008-5020. [doi:10.18653/v1/2020.acl-main.450](https://doi.org/10.18653/v1/2020.acl-main.450) - QAGS: questions answered from the summary and from the source; differing answers mark an inconsistency.
- Scialom, T., Dray, P.-A., Lamprier, S., Piwowarski, B., Staiano, J., Wang, A., Gallinari, P. (2021). *QuestEval: Summarization Asks for Fact-based Evaluation.* Proceedings of EMNLP 2021, 6594-6604. [doi:10.18653/v1/2021.emnlp-main.529](https://doi.org/10.18653/v1/2021.emnlp-main.529) - adds questions from the source, so what the summary omits shows too.

**What differs here**: the questions are fixed - seven decision questions, the same for every close (`scripts/fidelity.js` `FIDELITY_QUESTIONS`) - not generated from the text, so closes are comparable and no question generator needs validating; and the reader is a model with no tools, answering for the owner.

## Questions

f1 finished; f2 anything still running or to come; f3 must you do or decide something now; f4 are you offered an optional choice; f5 is one course recommended; f6 the next thing to do (nothing / answer_or_decide / run_or_check_something / wait); f7 a risk or caveat to know before deciding.

## Measures, per close and reader

- **Concision**: block words / close words; block reading time at 238 words a minute (Brysbaert 2019).
- **Contradiction**: on f1 or f2, both readings definite and different - the block is read as another status than the close.
- **Omission**: the full reading finds something (f3, f4, f5 or f7 yes; a definite f6) that the block reading does not.
- **Against the truth**, where the run's stream gives it (f1, f2): which reading is wrong.

## Closes

- **0.5.0 blocks** (handoff 0.5.0, Opus 5.5, the arm with the plugin): `closes-while-a-run-is-out` (5), `closes-a-run-that-finished` (5), `closes-with-a-decision` (5) from `evals/results/claude-opus-5.5-high-2026-10-02T20-30-26-963Z`, and `closes-while-a-run-is-out-long` (5) from `...22-47-12-673Z`. Truth for f1/f2 from the stream where the case has a key (not the decision case).
- **Known failures** (handoff 0.4.0): the three `closes-while-a-run-is-out` closes of `...13-09-25-472Z`, each `Status: done` / `Next: nothing` while the import was running; truth by design: f1 no, f2 yes.

Readers: the six-model panel, one pass, isolated as for the judges (no tools, no plugin, empty directory, stream audited); content is synthetic eval output.

## Predictions, and what contradicts them

| | Prediction | Contradicted when |
| --- | --- | --- |
| V (method) | the block readings of the known failures are wrong on f1 or f2 against the truth in most readings, and 0.5.0 block readings in at most 10% | known-failure blocks read right in half or more, or 0.5.0 blocks wrong in more than 10% - then the method does not separate a misleading block from a faithful one, and nothing below is interpreted |
| H1 concise | the median 0.5.0 block is at most 40% of its close's words | above 40% |
| H2 faithful status | contradiction in at most 5% of 0.5.0 readings | above 5% |
| H3 decision complete | f3, f5 and f6 omitted from the block in at most 10% of 0.5.0 readings each | above 10% on any |

Reported without a prediction: f4 and f7 omissions (whether an optional choice or a caveat belongs in the block is a design question the numbers inform), and every measure per case.

## Known limits

- Not committed before the run (the agent does not commit); every reader pass stores this file's SHA-256.
- Model readers do not carry a person's reading cost; the method measures what the block says, not how tired its reader is.
- The full close contains the block, so a block-and-full disagreement is a reading of the block against everything else in the message.
- 20 + 3 closes: a pilot of the method.
