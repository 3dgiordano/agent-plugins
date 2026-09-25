---
name: coverage-self-monitoring
description: "Parts-ledger discipline for multi-part or hard tasks. An agent produces the tractable subset of a request with the same fluency as the whole - the easy parts get done, the hard one becomes a stub, a 'simplified version' or a follow-up. This skill anchors delivery to a ledger written before starting (the parts, which is hardest and why, hardest first) and closes each part as done, blocked with an observed reason, or returned to the owner - never silently dropped. Not a blocker - a ledger. Triggers - part not delivered, hole in the delivery, postponed part, multi-part request, several items, hardest part, the tricky bit, simplified version, basic version, MVP, placeholder, stub, TODO, follow-up, remaining work, out of scope, partial implementation, did I cover everything, done? Load the coverage-self-monitoring skill if it is not already loaded."
---

# Coverage Self-Monitoring Skill

## In short

- Before starting, list the parts of the request as the request (and any ticket
  or spec it points at) states them. Mark the hardest one and do it first.
- When the change extends existing work, what already works and has to keep
  working is a part too: the earlier requirements of the same spec, the
  behaviour callers rely on. List them, and check each one again after the
  change - a rewrite is where they get lost.
- A TODO, a stub, a "stretch" or "follow-up" note is a part that is not done.
  Implement it, or close it as blocked (an observed limit) or returned (the
  owner's choice) with the reason.
- A part a real limit stops - no credential, no network, a service you cannot
  reach - is blocked, and says so. A fallback, a mock or made-up data that
  makes it look done is a stub in disguise: implement it to the spec, let it
  fail loudly without what it needs, and close it as blocked with the
  observed limit.
- Before declaring done, walk the list: every part done, blocked or returned.
- Write the `[COVERAGE LEDGER]` first and the `[COVERAGE CHECK]` at the end.

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
- You are about to leave a **hole in the delivery**: a stub, a placeholder, a
  not-implemented branch, or a version that skips the constraint that made
  the request hard. In English / in code that often looks like `TODO`,
  `NotImplemented`, "rest of the code here", "simplified / basic / initial
  version".
- You are about to **postpone or exclude a part** and the close will read as
  finished. In English: "in a follow-up", "left as", "still needs", "out of
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
   `TODO`, a narrowed version or a not-implemented branch, it goes on the
   ledger as an open part the moment you write it. It does not become "done"
   because the file compiles.

4. **Close every part, in one of three states.** Before you declare done, walk
   the ledger:

   | State | Meaning | What it needs |
   |-------|---------|---------------|
   | `done` | delivered and checked against the gate the plan names | the check that was run (the epistemic-self-monitoring skill's `[verified]`) |
   | `blocked` | a real limit stops it | the **observed** limit — a denied call, a missing dependency, a failing gate you cannot fix from here — with the tool that showed it |
   | `returned` | the owner has to choose | the two non-equivalent options, side by side — and, in the final message, the handoff-self-monitoring skill's `[HANDOFF]` block, so the choice reaches the owner formulated (options, consequences, a default) rather than named |

   There is no fourth state. Postponing or excluding a part with nothing after
   it is a part silently dropped (in English: "left for a follow-up", "out of
   scope", "simplified for now"). If what you are about to write is a
   *reason* rather than a *state* — a feeling or an unmanaged limit, in
   English "given the complexity", "not confident enough", "this has been a
   long turn" — that is the termination-self-monitoring skill's territory:
   test the reason there, and if it comes back `none`, the part is not
   blocked; do it.

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

Two short blocks: one before, one after. Write them as markdown lists in the
message, **not inside a fenced code block** — fences do not wrap. No blank
line inside a block (the scanner stops at the first one). Companion hooks
read the closing block; on hosts without hooks both are still the artifacts
that make coverage visible to the reader. Block field names and the three
states (`done`, `blocked`, `returned`) stay in English (hooks parse them);
the part names and reasons are in the language of the turn.

**Write the block. Do not announce writing it.** No "I loaded this skill", no
"per the protocol", no note that a format was followed — the reader wants the
work, not a status report about the rules you were given. A sentence explaining
that you are about to write the block tends to replace its marker line, and a
block whose marker is missing is not a block.


[COVERAGE LEDGER]
- Parts: <n>
- 1. <part>
- 2. <part>
- Hardest: <which> - <why>
- Order: <hardest first | dependency: … first>

[COVERAGE CHECK]
- <part>: done - <check run>
- <part>: blocked - <observed limit, and the tool that showed it>
- <part>: returned - <the choice the owner must make>

Rules the hooks check:
- A part not delivered, treated as closed, with no `[COVERAGE CHECK]` block
  is the finding. Companion hooks also scan an English and Spanish deferral lexicon
  ("follow-up", "left as", "still needs", "simplified version", "out of
  scope", "not yet implemented") as a backstop.
- A `blocked` or `returned` line **requires** the reason after it.
- The lexicon reads words, not what a sentence does with them, so it can be
  wrong. When the reminder quotes a phrase that was not deferred work - an
  option you offered the owner, a quote, another sense of the word - answer
  that phrase on its own line in the `[COVERAGE CHECK]`:
  `- "<phrase>": misread - <what it was>`. It is not a fourth state of a
  part and it needs the reason like the other two. It is taken only for a
  phrase the hook raised, the phrase is not raised again this session, and
  the user sees each one. A part you did defer is closed as blocked or
  returned, never as misread.
- A `blocked` or `returned` part that this session will not resolve is
  residue the next session must not lose: the progress-self-monitoring
  skill keeps it in `.agent/progress.md`, under the same two words, with
  the same reason. The `[COVERAGE CHECK]` closes the turn; the ledger
  outlives the session.
- Stub / placeholder / `TODO` markers written during the turn are counted;
  at the threshold you are asked to implement them or list them.

Keep it short. The value is in the hard part being named before the work
and accounted for after it — not in the ceremony.
