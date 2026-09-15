---
name: coverage-self-monitoring
description: "Parts-ledger discipline for multi-part or hard tasks. An agent produces the tractable subset of a request with the same fluency as the whole - the easy parts get done, the hard one becomes a stub, a 'simplified version' or a follow-up. This skill anchors delivery to a ledger written before starting (the parts, which is hardest and why, hardest first) and closes each part as done, blocked with an observed reason, or returned to the owner - never silently dropped. Not a blocker - a ledger. Triggers - multi-part request, several items, hardest part, the tricky bit, simplified version, basic version, MVP, placeholder, stub, TODO, follow-up, remaining work, out of scope, partial implementation, did I cover everything, done?"
---

# Coverage Self-Monitoring Skill

**Purpose:** Make sure what you deliver covers every part of the request —
including the hard one — and that any part you did not deliver is closed with
a reason that can be checked, not dropped in silence. The
executive-self-monitoring skill watches for work *outside* the plan; this one
watches for work *below* it.

**Key idea:** you do not avoid hard parts — you have nothing to be averse
with. What happens is plainer: the continuation of least cost is sampled with
the same fluency as any other, and the tractable subset of a task reads like
a finished task. The literature calls the result **goal substitution**, a
**shortcut**, **partial task completion**, or **compute misallocation**: the
effort did not go where the difficulty was. The remedy is not "try harder".
It is an **external ledger** — written before the work, so the hard part is
named while it is still just a name — and a closing check against it.

## When to Activate

- The request has several parts (a companion hook counts enumerated items
  and asks for the ledger at three or more), or one part that is clearly the
  hard one.
- You are about to write a stub, a placeholder, a `TODO`, `NotImplemented`,
  "rest of the code here", or a "simplified / basic / initial version".
- You are about to write "in a follow-up", "left as", "still needs", "out of
  scope", "remaining work".
- A companion hook reports a stub count, or that your previous turn deferred
  work without closing the ledger.

## Core Protocol

1. **Write the ledger before starting.** List the parts of the request as the
   request states them — not as you would prefer to slice them. Mark the
   **hardest** part and say *why* it is hard: an unknown API, a cross-cutting
   change, missing tests, a design decision, a path you have not read.
   If you cannot name a hardest part, look again; there almost always is one.

2. **Take the hardest part first,** unless a dependency forbids it — and then
   say which dependency. The order is part of the ledger. Doing the easy
   parts first produces a message that *looks* mostly done and a hard part
   that is still just a name; doing the hard part first produces the
   information the rest of the work needs.

3. **A stub is a debt, not a delivery.** If you write a placeholder, a
   `TODO`, a "simplified version" or a not-implemented branch, it goes on the
   ledger as an open part the moment you write it. It does not become "done"
   because the file compiles.

4. **Close every part, in one of three states.** Before you declare done, walk
   the ledger:

   | State | Meaning | What it needs |
   |-------|---------|---------------|
   | `done` | delivered and checked against the gate the plan names | the check that was run (the epistemic-self-monitoring skill's `[verified]`) |
   | `blocked` | a real limit stops it | the **observed** limit — a denied call, a missing dependency, a failing gate you cannot fix from here — with the tool that showed it |
   | `returned` | the owner has to choose | the two non-equivalent options, side by side |

   There is no fourth state. "Left for a follow-up", "out of scope",
   "simplified for now" with nothing after it is a part silently dropped. If
   what you are about to write is a *reason* rather than a *state* — "given
   the complexity", "not confident enough", "this has been a long turn" —
   that is the termination-self-monitoring skill's territory: test the reason
   there, and if it comes back `none`, the part is not blocked; do it.

5. **Compare the closing ledger to the opening one.** Same parts, same
   hardest part? A part that vanished between the two is the finding.

## Coverage failure signatures

- **Easy-first** — the enumerated parts are taken in the order that yields
  the most green the fastest; the hard one is last and unfinished.
- **The stub that ships** — a `TODO` or `NotImplemented` inside otherwise
  working code, reported as "implemented".
- **The simplified version** — a version that skips exactly the constraint
  that made the request non-trivial (concurrency, the error path, the
  migration, the edge case in the original bug report).
- **The re-sliced request** — parts renamed or merged so the missing one has
  no line of its own.
- **The follow-up that is the task** — "the streaming path can be added in a
  follow-up" when the streaming path was the request.
- **Done-by-message** — a closing summary whose confidence is not backed by a
  per-part check; the epistemic-self-monitoring skill's closure rules apply
  to each `done`.

## Integration

Two short blocks: one before, one after. Companion hooks read the closing
block; on hosts without hooks both are still the artifacts that make coverage
visible to the reader.

```
[COVERAGE LEDGER]
- Parts: <n>
- 1. <part>
- 2. <part>
- Hardest: <which> - <why>
- Order: <hardest first | dependency: … first>
```

```
[COVERAGE CHECK]
- <part>: done - <check run>
- <part>: blocked - <observed limit, and the tool that showed it>
- <part>: returned - <the choice the owner must make>
```

Rules the hooks check:
- Deferral language in the final message ("follow-up", "left as", "still
  needs", "simplified version", "out of scope", "not yet implemented") with
  no `[COVERAGE CHECK]` block is the finding.
- A `blocked` or `returned` line **requires** the reason after it.
- Stub / placeholder / `TODO` markers written during the turn are counted;
  at the threshold you are asked to implement them or list them.

Keep it short. The value is in the hard part being named before the work
and accounted for after it — not in the ceremony.
