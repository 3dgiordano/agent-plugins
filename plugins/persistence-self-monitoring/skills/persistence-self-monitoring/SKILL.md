---
name: persistence-self-monitoring
description: "Persist-or-quit self-check for when an approach has stopped working. Detects two things agents cannot feel - repeating variants of the same attempt, and effort out of proportion to the request - and turns them into an explicit decision: one more try with a stop condition, switch approach, step back to the plan, or report to the user. Not a blocker - a signal. Triggers - stuck, not working, keeps failing, tried again, still failing, retry, one more time, going in circles, rabbit hole, taking too long, sunk cost, when to give up."
---

# Persistence Self-Monitoring Skill

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

When a signal arrives, or you catch yourself repeating, insert a short block and
then act on the decision:

```
[PERSISTENCE CHECK]
- Attempts: <n> on <what>
- Hypothesis held: <one line>
- Rival approach: <one line>
- Proportion: <effort so far vs. size of the request>
- Decision: one more (stop condition: …) | switch | step back | report
```

Keep it short. The value is in the decision being explicit — and visible to the
user — not in the ritual.
