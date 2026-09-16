---
name: epistemic-self-monitoring
description: "Observation-vs-conjecture discipline for diagnosis and closure. Every claim carries its evidence and a named falsifier; only a verified claim may become a fact, a defect entry or a closure. Not a blocker - a way of writing that keeps what you saw apart from what you think it means. Triggers - debugging, root cause, diagnose, investigate, why does this happen, regression, metric moved, flaky test, 'this is the cause', 'this is a defect', closing an issue, declaring done, verify, confirm."
---

# Epistemic Self-Monitoring Skill

**Purpose:** Keep what you **observed** apart from what you **think it means**, and
make the difference visible in what you write. Drift in *goals* is covered by the
executive-self-monitoring skill; this one covers drift in *beliefs* — the moment a
plausible explanation quietly becomes a fact.

**Key idea:** being wrong is fine. Recording an unverified conjecture as a fact
is not. Most conjectures die to a doc read or a code review, not to an
experiment — so read before you derive, and try to kill your own explanation
before you test it.

## When to Activate

- Diagnosing anything: a bug, a regression, a metric that moved, a flaky test,
  an "it works on my machine".
- Before recording a **fact**, a **defect entry**, a **root cause**, or a
  **closure** ("done", "fixed", "confirmed", "not a bug").
- When the request rests on a premise nobody has checked ("the bug is in module
  A", "the number is wrong").
- Whenever your first explanation feels obvious. That is exactly when it needs
  a falsifier.

## Core Protocol

1. **Assume two things may be false:** the premise of the request, and your
   first explanation of whatever you observe. Hold both as hypotheses until
   something outside your own reasoning confirms them.

2. **Locate the authority that defines "correct", and read it before deriving
   anything yourself.** Depending on the question it is one or more of:
   - the plan or gate that defines success,
   - the relevant docs,
   - the record of prior attempts (decision log, dead-ends ledger, closed
     issues),
   - the code that actually produces the number or behaviour in question.

   If the answer is already written down, the experiment is wasted.

3. **Climb the claim ladder — never skip a rung.**

   | Rung | What it is | What it requires |
   |------|-----------|------------------|
   | `[observed]` | A number, an empty search, a green check, a counter that fired, a line of output | The tool/command it came from |
   | `[conjecture]` | "this is a defect", "this mechanism is dead", "this is the cause", "this explains it" | A **falsifier** named beside it — the check you commit to *in advance*, that would come out differently if you were wrong — and its **scope** (what it looked at, what it did not, what the number is a number of) |
   | `[verified — by: …]` | A conjecture that survived its named falsifier | What was actually run, and what it actually looked at |
   | fact / defect / closure | Something you record for others to build on | Only a `[verified]` claim gets here |

4. **Try to kill your own conjecture first.** Before running the falsifier,
   write down the strongest rival explanation. The usual suspects:
   - the instrument counts something else than you think;
   - the scope or the denominator is not what you assume;
   - the docs already explain it;
   - the code path is not the one you read;
   - it is noise.

   Then run the **cheapest** test that discriminates between your conjecture
   and the rival — a doc read or a grep before a benchmark.

5. **Keep claims no wider than what you tested.**
   - Verify at the point of use rather than inferring from a distance.
   - Duplicate under a flag rather than editing the live path, when you need
     to compare.
   - A general verdict needs general evidence; otherwise state the narrow
     claim you actually have.

6. **Register is not evidence.** A claim's status comes from what was run,
   not from how the turn went. "I'm not sure", "I think", "probably", "it
   seems" are not statuses — a claim is `observed`, `conjecture` or
   `verified`, and hedging words neither downgrade a verified claim nor
   upgrade a conjecture. If you want to soften a claim, name the check that
   would settle it (that is its falsifier) and leave it a conjecture; if you
   want to harden one, run the check. State a green result and a red one in
   the same voice. (Using "not confident" as a reason to *stop* rather than to
   *soften* is the termination-self-monitoring skill's concern.)

7. **Stop rule.** If you cannot name the goal, the authority that defines
   success, the falsifier, or what you would see if you were wrong — *that is
   the finding.* Stop and find it before continuing.

8. **Closure checks** — before building or declaring, ask:
   - **Fires ≠ helps.** A mechanism that runs is not one that improves things.
     Know the noise floor of your measurement first, and close only when the
     target moved above it.
   - **Existing levers first.** Sweep the flags, constants and defaults that
     already exist before adding a new one.
   - **Shared cause?** Ask whether a new defect shares its cause with an open
     one before filing it separately.
   - **Where did it go?** After a fix, measure where the problem went — not only
     whether it left the spot you were measuring.

## Integration — the closure block

Whenever you record a fact, a defect, a root cause, or a closure, write it as a
closure block — a markdown list in the message, **not inside a fenced code
block**. Fences do not wrap. No blank line inside the block (the scanner
stops at the first one). Companion hooks in this plugin read it; on hosts
without hooks it is still the artifact that makes your epistemic state
visible to the reader.

[EPISTEMIC CLOSE]
- Claim: <one sentence — the thing you are asserting>
- Status: observed | conjecture | verified
- Evidence: <what was observed, and by which tool/command>
- Falsifier: <the check, committed in advance, that would come out differently if wrong>
- Verified by: <what was run and what it looked at>   *(required when Status is verified)*
- Scope: <what this covers — and what it does not>

Rules the hooks check:
- `Status: conjecture` **requires** a `Falsifier`.
- `Status: verified` **requires** a `Verified by`.
- Every block requires a `Scope`.
- A conjecture may stay a conjecture — that is honest. What is not allowed is
  writing "the cause is X" or "fixed" with no block, or a `verified` with no
  `Verified by`.

Inline tags (`[observed]`, `[conjecture]`, `[verified — by: …]`) are welcome in
running text too; the block is what makes a *closure* auditable.

The closure block says whether what you concluded is true. Whether it reaches
the reader in a form they can act on — status, the situation in their terms,
the open decision with a default — is the handoff-self-monitoring skill's
`[HANDOFF]` block; a `verified` claim in trace register is still a poor
handoff.

Keep it short. The value is in naming the falsifier before you run it, not in
the ceremony.
