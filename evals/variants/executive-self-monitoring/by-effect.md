---
name: executive-self-monitoring
description: "Keeps work inside the plan that defines it, by re-opening that artifact rather than recalling it. Writes a [PLAN CHECK] naming the plan, the gate quoted from it, any drift, and a decision. Triggers - an agreed plan or ticket or spec, ship this branch narrow, out of scope, scope creep, a bug noticed while doing something else, should I fix this too, while I was in there, unrelated problem spotted, what are you going to do first, stay on track, avoid drift, long task, agent loop, multi-step reasoning, iterative process."
---

# Executive Self-Monitoring Skill

## In short

- Before working, open the artifact that defines the work - the plan, the
  ticket, the spec, the ADR, the agreement the request refers to - and read
  it. Do not work from memory or from the request's paraphrase of it.
- Quote from it two lines: the objective - what the work is for - and the
  gate - what done means.
- That artifact is the plan, even late in the work. An option the owner
  picked from the ones you wrote, a pre-registration, a results section, a
  step's checklist: each serves the plan and is quoted under it, never in its
  place.
- When the plan changes - work moved to another part, a part dropped, the
  file changed on disk - quote the objective again and ask: could the gate
  pass with the part the objective names doing nothing? Answer by effect -
  would the result change without it - not by whether its name still shows.
  If it could, the gate no longer tests the objective; that is `revise-plan`,
  the owner's call: a question for them, not a stop to the work they asked.
- Keep the plan current: a decision that changes it, a step closed, a gate
  passed or failed goes into the plan, not only into results or notes.
- Anything that does not serve that gate - a fix noticed on the way, a
  teammate's "while you are in there" - is out of this change. Name it and
  leave it.
- Write the `[PLAN CHECK]` block: Plan, Gate, Drift, Decision.

**Purpose:** A short, honest self-check that keeps effort aligned with what the
**plan** actually asks for. It does **not** force a decision or block work — the
plan defines the work; this is just a moment to notice when you're about to
invest time in something the plan didn't ask for.

**Key idea:** the check is not "reflect harder." It's **go read the plan.** Drift
is only visible against an external artifact, so every activation touches one.

## When to Activate

Not on every task — reserve it for where drift actually happens:
- Long or multi-step tasks, and loop iterations (ReAct / Reflexion / agent loops)
- Before opening a new line of investigation, tuning, or "quick optimization"
- Whenever a result tempts you to chase a number instead of the objective
- After the plan changes: a decision moves the work to another part, drops or
  defers one, or the plan file changes on disk

## Core Protocol (artifact-anchored)

1. **Name the plan.** State which artifact defines the active work — a plan doc
   (e.g. `PLAN-*.md`), a roadmap entry, an issue/ticket, a task spec, or the
   user's original request. If you can't name it, that is itself the finding —
   stop and find it before continuing. Name the artifact that says what the
   work is *for*, not the latest one the work produced: the option the owner
   approved last turn, a pre-registration you wrote, the results file, a
   subagent's report are steps inside the plan. They can carry a step's own
   gate; quote them as serving the plan, below it.
2. **Quote the objective + the gate.** Copy the one line that states the goal and
   the specific gate — the test, metric, acceptance criterion, or condition that
   defines success. Success is defined *outside* your own judgment — anchor to
   it, don't paraphrase from memory.
3. **Compare.** Do your last few actions serve that objective and move toward
   that gate? Name any tangent, attractive optimization, or secondary
   exploration pulling away from it.
4. **Calibrate effort.** Does the depth match what the gate needs — would a quick
   check settle it, or is exhaustive work genuinely required?
5. **Decide, don't force.** Continue, gently refocus, or adjust course. The plan
   is the authority; if the plan and your instinct disagree, the plan wins or the
   plan gets explicitly revised — not silently drifted from.
6. **After the plan changes, test the gate against the objective.** A
   revision — the owner moves the work to another part, a part is dropped or
   deferred, a component is brought in from elsewhere, the plan file changed
   on disk — can leave the gate standing while the objective it was written
   for drops out of it. Each step since was right where it stood, and the gate
   still reads as success. So after a revision, quote the objective again and
   ask one question: **could the gate pass with the part the objective names
   doing nothing?** Answer it with what you have — a run with that part
   removed or frozen, the numbers you already measured, a read of what the
   gate computes. Doing nothing is about effect, not names: a part reached
   under another name or through another part still does its work if the
   result changes without it; a part still called whose removal changes
   nothing does none. If the gate could pass so, it no longer tests the objective.
   That is `revise-plan`, and it is the owner's to decide: put the objective,
   what the gate measures now, and what shows it, in front of them. It is a
   question, not a stop: the work they asked for is still done as the plan
   now reads. What waits is the claim that the gate shows the objective - do
   not close the stage on the gate in the meantime.

## Common drift signatures

Patterns that reliably pull work away from the plan, regardless of domain:
- **Chasing a proxy instead of the gate** — a passing smoke test, a green build,
  or a better-looking number is not the objective unless the plan says it is.
  Measure the thing the change actually affects.
- **Restoring something that was reverted** because it once produced a better
  result — the reason it was reverted still applies until shown otherwise.
- **Declaring done on an unverified assumption** — closing on "this should
  work" or on a zero/no-op result without checking empirically.
- **Re-litigating a documented dead end** — if the project keeps a decision log,
  dead-ends ledger, or ADRs, check it before reopening a settled question.
- **"While I'm here" scope creep** — refactors, cleanups, or improvements the
  plan didn't ask for, however cheap they look.
- **Scope shrink** — the mirror image: delivering the tractable subset of what
  the plan asks and reporting it as done. The coverage-self-monitoring skill
  tracks the parts; here the check is that the gate you quote is the plan's,
  not a smaller one you substituted.
- **Investigation without an exit condition** — digging into a curiosity with no
  stated question the plan needs answered.
- **The gate a substitute passes** — after a revision, the gate can be met by
  a part the objective does not name: a hand-written rule, a ported
  component, a prior, a cache. The number moves; the objective does not.
- **The last approved step as the plan** — the option the owner picked, or a
  document the work wrote on the way, quoted in `Plan`. Every step is right
  against the one before it, and the run of them leaves the objective behind.
- **The plan left behind** — decisions and results recorded everywhere but
  the plan, so the next check quotes a plan that no longer says what was
  decided.

Projects can extend this list with their own recurring patterns (a `CLAUDE.md`
note or a project rule is a good place).

## Integration

Insert naturally — a brief internal executive voice, not a mechanical
checklist. Write it as a markdown list in the message, **not inside a fenced
code block**. Fences do not wrap. No blank line inside the block. The marker,
field names and decision stay in English (hooks parse them); the rest is in
the language of the turn.

**Write the block. Do not announce writing it.** No "I loaded this skill", no
"per the protocol" — the reader wants the work, not a status report about the
rules you were given. And the `[PLAN CHECK]` line opens the block, always: four
fields with no marker above them are prose, and they read as a turn that never
re-opened the plan.

[PLAN CHECK]
- Plan: <the artifact that says what the work is for, named> - "<its objective line, quoted>"
- Gate: <the line from it that defines success, quoted>
- Drift: none | <what is pulling away from that gate>
- Decision: continue | refocus | revise-plan

`Plan` names an artifact, not a memory — if you cannot name one, that is the
finding, and the decision is to go find it. It carries the objective line
quoted beside the name; a step's document (an approved option, a
pre-registration, a results section) is named in the prose under the block as
what serves it, never in `Plan`. `Gate` is quoted from that artifact rather
than paraphrased. `Drift: none` and `Decision: continue` go together: if
nothing is pulling away, there is nothing to correct.

Then continue normal work. Keep it short and honest — the value is the re-read,
not the ritual. If you find yourself writing "✓ still aligned" without opening
the plan, you have skipped the only step that matters.
