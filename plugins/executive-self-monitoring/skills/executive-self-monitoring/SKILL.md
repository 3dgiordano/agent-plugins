---
name: executive-self-monitoring
description: "Lightweight self-assessment to avoid investing effort outside the active plan. Not a gate and not a blocker - a periodic prompt to re-ground in the canonical plan/gate so work stays plan-defined. Triggers - long task, agent loop, multi-step reasoning, keep focus, avoid drift, stay on track, iterative process, ReAct, Reflexion, long reasoning session."
---

# Executive Self-Monitoring Skill

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

## Core Protocol (artifact-anchored)

1. **Name the plan.** State which artifact defines the active work — a plan doc
   (e.g. `PLAN-*.md`), a roadmap entry, an issue/ticket, a task spec, or the
   user's original request. If you can't name it, that is itself the finding —
   stop and find it before continuing.
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

Projects can extend this list with their own recurring patterns (a `CLAUDE.md`
note or a project rule is a good place).

## Integration

Insert naturally — a brief internal executive voice, not a mechanical checklist:

```
[EXECUTIVE SELF-MONITORING]
- Active plan/gate: <artifact + one-line objective + gate>
- Aligned? <yes / drifting because …>
- Decision: <continue / refocus / revise plan>
```

Then continue normal work. Keep it short and honest — the value is the re-read,
not the ritual. If you find yourself writing "✓ still aligned" without opening
the plan, you have skipped the only step that matters.
