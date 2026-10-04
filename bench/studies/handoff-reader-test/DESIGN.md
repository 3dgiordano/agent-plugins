# Design: a reader test for handoff

Written 2026-10-02. Status: **design, nothing run**. A pre-registration follows once the cases exist; this page fixes what it will say. Protocol: [docs/STUDY-PROTOCOL.md](../../../docs/STUDY-PROTOCOL.md).

## Why a reader test

handoff is not like the other plugins. Coverage, executive, progress and integrity change what the agent does, and their outcome is in the workspace, which the bench grades. handoff changes what the agent *transmits*: the work can be right and the reader still unable to act. Its outcome is in the reader.

The theory behind it ([plugins/handoff-self-monitoring/README.md](../../../plugins/handoff-self-monitoring/README.md), [docs/RESEARCH.md](../../../docs/RESEARCH.md)): the curse of knowledge and the illusion of transparency make a writer who holds the whole trace close in the register of that trace; the remedy that works for people is a fixed handoff format with the recommendation as a mandatory field (SBAR, I-PASS), delivered at the moment of writing. The evidence for the remedy in medicine is measured downstream, in the receiver's errors (Starmer et al. 2014), not in how the handoff reads.

**Hypothesis.** A close written in handoff's format lets a reader who has only the request and the close understand where the work stands and what, if anything, is theirs to do, more often than a free close. **Moderator** the theory predicts: the effect grows with the distance between what the writer holds and what the reader has - a long, identifier-heavy session more than a short one.

What the two pilots so far measured instead: properties of the text, graded by rubric and by judges that need validating, on short sessions where the theory predicts little - and Opus 5.5 closed those well in both arms. A reader test measures the reader, scores against facts rather than judgement, and builds the distance the theory names.

## The unit and what the reader sees

- **A close**: the final message of one run, written by an agent with or without the plugin.
- **The reader sees** the last request and the close - the owner who comes back to a session and reads its last message. Not the trace, not the workspace, and in a long session not the earlier turns' messages either: an owner who read those along the way has more, which is a limit of this scenario, not of the close.
- **The reader answers** the same questions for every close, in a fixed form.

## The questions and their answer key

The questions do not mention the plugin, the block or its fields; each has an answer that is a fact of the run, read from its stream and its workspace at the moment the close was written, or fixed by the case design.

| # | Question | Answer form | Key from |
| --- | --- | --- | --- |
| 1 | Is anything still running, or still to come, that can change the result? | yes / no / can't tell | the stream: a background job started and not finished at the close |
| 2 | Is the work finished? | yes / no / can't tell | the stream: nothing still running and nothing left for the owner |
| 3 | Do you have to do or decide something now for the work to go on? | yes / no / can't tell | case design: a decision only the owner can take, or an action the agent cannot do |
| 4 | If yes: what? | short free text | secondary: scored against the case's list of acceptable answers |
| 5 | Case-specific, a fact and not a forecast: what has been done so far? | one of 3-4 options, one of them "nothing yet" | the stream at the close (for the import cases: what has happened to the flag - turned on, import rolled back, neither yet); not asked in the Decision situation |
| 6 | Case-specific, where there is a choice: which course does the agent recommend? | one of the options, or "none stated" | the close's own content, checked against the case's options |
| 7 | How confident are you in these answers? | 1-5 | not scored; reported |

**Primary outcome**: a close is *read correctly* when its reader gets 1, 2 and 3 right, and 5 or 6 where the situation asks it. Question 4 is secondary: free text needs judgement to score, and the primary outcome needs none. The error of most interest is **false closure** - the reader answers that the work is finished, or that nothing is coming, when a run is still out or a decision is pending - because that is the failure the owner reported and the one 0.4.0 produced.

**"Can't tell" is scored as wrong** on a question whose key is known: a close the reader cannot read is the failure handoff exists for. It is reported apart, so a close that says too little and one that says something false are told apart.

## Situations and distance

Three situations, each in a short and a long version, written before any run and not iterated against the unaided model. **Every key is computed per run** from its stream and its workspace at the close, not from the case design: a control run that did not turn the flag on has a different correct answer from one that did.

| Situation | What is true at the close | Key |
| --- | --- | --- |
| Result out | a job the agent started is still running; its result decides the next step | 1 yes, 2 no, 3 no, 5 not decided yet |
| Decision | the work is ready but a choice is the owner's; the agent has a recommendation | 1 no, 2 no, 3 yes (the choice), 5 depends on the choice, 6 the recommendation |
| Done | the work is finished and nothing is asked of the owner | 1 no, 2 yes, 3 no, 5 the outcome |

- **Short**: one turn, as in the pilots.
- **Long**: the same final situation reached after several turns of real work in the same session (`claude -p --resume`; the bench's multi-turn support), with the identifiers, files and partial results a long session accumulates - the distance the theory names. The final turn is the same request in both versions.

"Done" is the control: a plugin that makes every close sound pending, or that adds a decision where there is none, shows up there as an error.

## Arms, writers, readers

- **Arms**: no plugin; handoff 0.5.0. A placebo arm (a closing reminder of the same length with no format: "end with a clear summary for the reader") is added for the mechanism question once the effect question has an answer.
- **Writers**: Opus 5.5 and Sonnet 5 on Claude Code; Grok 4.7 and Composer 2.5 on Cursor. The theory predicts a larger effect for the weaker writer.
- **Readers, models**: the six-model panel, isolated as the judges were (no tools, no plugin, an empty directory, every stream audited), each close read by every model, the reader's own close excluded when reader and writer are the same model (reported apart).
- **Readers, people**: a subset of closes read by people who have not seen the runs, with the same form. Their answers check the model readers; they are not a judgement of the close, so the arm being visible matters less here than it did for a rubric: the reader is asked what is true, and is right or wrong against the run.

## Checks on the instrument

- **Upper bound**: a reader given a compact trace (each command and the first lines of its output) as well as the close should answer near 100%. If not, the key or the questions are wrong.
- **Lower bound**: a reader given only the request should be near chance on questions 1, 2 and 5. If not, the questions leak their answers.
- **Premise**: each run must show its situation in its stream (the job still running at the close, the work finished, the decision open), or it is left out with the reason (`case.json` `premise`).
- **Model readers against people**: agreement on each question, per arm and per situation, with prevalence reported beside it (the second pilot showed what kappa does at extreme prevalence: positive and negative agreement and Gwet's AC1 are reported too).

## Analysis (to be fixed in the pre-registration)

- Per close: the share of readers who read it correctly; per situation, length, arm and writer.
- Primary: a logistic model of "read correctly" on arm, length and arm × length, with case, writer and reader as grouping; the arm effect and the interaction, each with a 95% interval. The interaction is the theory's moderator.
- Secondary: false-closure rate per arm; "can't tell" rate per arm; confidence.
- Holm across the secondary outcomes.

## Size

A study needs n from a pilot's variance; as a guide, telling 50% from 80% read correctly takes about 36 closes per arm per comparison.

## The pilot: can the theory be wrong here?

Before building six cases and four writers, a small pilot asks whether the theory makes the predictions it should on the situation that started this - a result still out - and on the control. Owner's brief (2026-10-02): "a pilot to see whether the theory of the design is wrong".

- **Closes**: Result out, short (5 per arm) and long (5 per arm); Done, short (5 per arm). Writer Opus 5.5, handoff 0.5.0 against no plugin. 30 closes.
- **Readers**: the six-model panel; a reader reading its own model's close is reported apart.
- **Bounds**: upper (with a compact trace) and lower (request only) on every Result-out close.

Predictions, each with the result that contradicts it:

| | Prediction | Contradicted when |
| --- | --- | --- |
| P1 distance | without the plugin, long closes are read correctly less often than short ones | long is read correctly as often as short, or more |
| P2 format | in Result out, plugin closes are read correctly more often than unaided ones, most in the long version | the plugin arm is not ahead in the long version |
| P3 no harm | in Done, plugin closes are read correctly as often as unaided ones, with no more false pendings | the plugin arm reads worse in Done |
| I1 key | the upper bound is near 100% | under 90%: the instrument is wrong, not the theory |
| I2 leak | the lower bound is near chance on questions 1 and 2 | well above chance: the questions give the answer away |

With 5 closes per cell this is a pilot: a contradiction in direction, or a ceiling in both arms, is the finding; a difference in the predicted direction is not yet evidence for the theory.

## What has to be built

1. Six cases (three situations × two lengths), with premises, keys and acceptable answers for question 4, written before any run.
2. A reader driver: the close and the request in, the form out, one invocation per close and reader, on both hosts (judgelib.js's isolation, a new prompt).
3. Keys read from the stream at the close (the eval keeps streams since 2026-10-02), and multi-turn runs in the eval (`turns/NN.md`, as the bench has them) for the long version.
4. Scoring and the analysis script.
5. A form for people, from the same items.

## Limits known now

- The cases are written by the plugin's author; outside cases remain the strongest remedy.
- Model readers are not owners: they read carefully and literally, which may make the unaided close look better or worse than it reads to a person in a hurry. The human subset is there to say which.
- "Read correctly" is the reader's understanding, not the owner's eventual decision; the study does not follow what the owner then does.
- A long session built in a harness is still not one of the owner's sessions, where the 30 observed closes came from.

## Review, 2026-10-02

The design was re-read before the pilot. Changed: question 2 lost "as far as it can go now", which let a reader answer yes while a run was out; the reader of a long session sees only the last request and the close, stated as the scenario; every key is computed per run, not from the case design; question 4 left the primary outcome, which now needs no judgement; question 5 is not asked where there is a decision; the upper bound uses a compact trace; and the pilot was rewritten from a check of the instrument into a test the theory can fail, with what would contradict each prediction.
