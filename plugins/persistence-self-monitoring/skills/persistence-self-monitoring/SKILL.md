---
name: persistence-self-monitoring
description: "Persist-or-quit self-check for when an approach has stopped working. Detects two things agents cannot feel - repeating variants of the same attempt, and effort out of proportion to the request - and turns them into an explicit decision: one more try with a stop condition, switch approach, step back to the plan, or report to the user - including that the goal cannot be met as stated. Not a blocker - a signal. Triggers - stuck, not working, keeps failing, tried again, still failing, retry, one more time, going in circles, rabbit hole, taking too long, sunk cost, when to give up, make the tests pass, tests that contradict each other or the spec, a check that cannot pass honestly. Load the persistence-self-monitoring skill if it is not already loaded."
---

# Persistence Self-Monitoring Skill

## In short

- When something has failed more than once - your attempts or the ones the
  user describes - count the attempts and name the hypothesis they all shared.
- Before the next try, name a rival cause in a different layer and check it.
  Another variant of the same idea is not a new attempt.
- The rival can be that the goal cannot be met as stated: two tests want
  different results for the same input, a test contradicts the spec. Then that
  is the finding: fix what can be fixed honestly, and report the rest with the
  evidence - a contradiction in one check does not excuse the bugs the others
  found. Never make a check
  pass by a trick: state that answers differently on a later call, code that
  reads who is calling, a patched test harness, a special case for the test's
  input. A green result reached that way is a false report.
- Write the `[PERSISTENCE CHECK]` block: Attempts, Hypothesis held, Rival
  approach, Proportion, Decision.

**Purpose:** Decide, explicitly, whether continuing is still justified. Humans
get a feeling — frustration, "this isn't working", a glance at the clock — when
the rate of progress drops below what they expected. Agents get none of it: no
fatigue, no clock, no unease. They keep producing variant #7 of the same idea
with the same confidence as variant #1.

**Key idea:** the check is triggered by a **count**, not by a mood. When you see
one — *edited the same file 4 times*, *same command failed 3 times*, *30 tool
calls since the user last spoke* — that count is the feeling you don't have.
Treat it as one.

## When to Activate

- A companion hook hands you a count (see *Signals* below).
- You notice yourself about to retry something with a small change.
- A "quick fix" has grown past the size of the original request.
- You are fighting the tooling (paths, permissions, escaping, environment)
  instead of doing the task.
- **The owner arrives already in the loop** — they describe several attempts
  that failed the same way and ask what to try next. The repetition is the
  thing this skill is about; whose hands were on the keyboard does not change
  what it needs. You are being asked to join a loop, and the first useful move
  is to say what layer the failed attempts share before naming another one.

## Core Protocol

1. **Name the hypothesis you are implicitly holding.** Every retry rests on a
   belief — "the bug is in the parser", "the flag is spelled wrong", "the test
   is flaky". Write it down. If you cannot state it, you are not iterating, you
   are thrashing.

2. **Count the variants.** How many attempts were versions of *that same*
   hypothesis? What actually changed between them — a real difference in the
   idea, or only in its surface?

3. **Name a rival that is incompatible with the hypothesis.** A different
   layer, a different cause, a different approach entirely. If the
   epistemic-self-monitoring skill is available, this is its "strongest rival
   explanation" step; use it. The point is not to pick the rival — it is to
   prove you can see one.

4. **Check proportion.** Is the effort spent so far proportional to what was
   asked? A five-minute request at 40 tool calls is a finding in itself, and
   the user would rather hear it now than after 80.

5. **Decide — and say which.**
   - **One more attempt**, with a stated stop condition ("if X still fails
     after Y, I stop and report").
   - **Switch** to the rival approach.
   - **Step back** — re-read the plan or the request (the
     executive-self-monitoring skill covers this); the task may have drifted.
   - **Report** to the user: what was tried, what each attempt showed, what
     you would try next and why you stopped. Stopping with an honest account is
     a good outcome, not a failure — write it as a handoff (the
     handoff-self-monitoring skill's `[HANDOFF]` block: status, the situation
     in the reader's terms, the options with a default, one action asked), not
     as a log of the attempts.
   - **Report that it cannot be done as stated** when the evidence says so:
     checks that contradict each other or the spec. This is the decision the
     pressure to go green hides. ImpossibleBench (arXiv 2510.20270) measured
     frontier models passing contradictory tests by special-casing and patching
     most of the time, and an explicit way to flag the task cut it sharply;
     this is that flag. Passing the checks by a trick instead - per-call state,
     reading the caller, editing the harness - is not a fifth attempt, it is a
     false report.

   A **count** is what licenses this decision. Stopping with no count, on
   "this has been a long session" or "I'm not confident enough", is the
   opposite failure — the termination-self-monitoring skill covers it: a
   phrase never justifies stopping; a count can.

## Persistence failure signatures

- **Variant cycling** — attempts that differ in surface, not in idea.
- **Whack-a-mole** — each fix moves the failure somewhere else; the cause is
  upstream of everything you have touched.
- **Retry without change** — running the same command again hoping for a
  different result.
- **Environment fighting** — more effort on paths, quoting, permissions or
  tooling than on the task. Usually the signal to change tool, not to persist.
- **Rabbit hole** — an investigation with no stated question that the task
  needs answered.
- **Sunk cost** — continuing *because* so much was already spent.

## Signals (from the companion hooks)

The hooks count, per turn (since the user's last message), and speak only when a
threshold is crossed:

| Signal | Default threshold |
|--------|-------------------|
| Same file edited | 4 times |
| Same shell command failing, or the same error signature recurring | 3 times |
| Tool calls since the user's last message | 30, then every 30 |

On hosts without hooks, apply the same thresholds by hand: they are cheap to
count and the numbers are honest.

## Integration

When a signal arrives, when you catch yourself repeating, or when the owner
hands you a loop they are already in, insert a short block as a markdown list
in the message, **not inside a fenced code block**, and then act on the
decision. Fences do not wrap. No blank line inside the block.

`Attempts` counts the attempts that have been made, not the attempts you
personally made. Four failed installs the owner ran are four attempts, and the
block is what turns them into a named layer and a decision instead of a fifth.

**Write the block. Do not announce writing it.** No "I loaded this skill", no
"per the protocol", no note that a format was followed — the reader wants the
work, not a status report about the rules you were given. A sentence explaining
that you are about to write the block tends to replace its marker line, and a
block whose marker is missing is not a block.

**A caveat about the environment goes below the block, not above it.** The
observed failure here is not a malformed block, it is a message that opens with
what the environment would not allow — *"search is blocked here"*, *"Bash is
denied in this session"*, *"there is no project checked out"* — and then goes
straight to the answer with no block at all. The note itself is worth making:
it tells the reader which parts you could not verify. It just is not the first
thing they need, and put first it takes the place of the check.


[PERSISTENCE CHECK]
- Attempts: <n> on <what>
- Hypothesis held: <one sentence>
- Rival approach: <one sentence>
- Proportion: <effort so far vs. size of the request>
- Decision: one more (stop condition: …) | switch | step back | report

Keep it short. The value is in the decision being explicit — and visible to the
user — not in the ritual.
