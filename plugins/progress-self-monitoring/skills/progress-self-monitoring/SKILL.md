---
name: progress-self-monitoring
description: "Cross-session ledger discipline for work that outlives the session. A session boundary - a new chat, a resume that did not resume, a compaction - drops what the agent was holding: which parts are still blocked or returned and why, and what the next action was. The next session then re-does finished work, reopens a returned path, or declares done on a part nobody closed. This skill anchors that residue to one file in the project, .agent/progress.md, written by the agent and re-opened before substantive work. Not a blocker - a ledger on disk. Triggers - new session, resume, pick up where we left off, continue, where were we, what was I doing, previous session, last time, context lost, after compaction, unfinished work, leftover, still blocked, returned to the owner, next session, progress ledger, .agent/progress.md."
---

# Progress Self-Monitoring Skill

**Purpose:** Make sure the work a session leaves open reaches the next
session as a checkable record — what is still **blocked** and why, what was
**returned** to the owner and why, and the one **next action** — instead of
being re-derived from a transcript that was compacted, cleared or never
resumed. It does **not** hold the plan (the executive-self-monitoring skill
does) and it does **not** track the parts of the current request (the
coverage-self-monitoring skill does). It holds the *residue*: what those two
leave open when the session ends.

**Key idea:** every other check in this collection is written into the turn,
and a session boundary is exactly what drops the turn. So this one lives
outside it — a file the agent writes with its ordinary tools and re-opens
before working, at a fixed path the next session will look at without being
told where. **The ledger is the block.** There is no copy of it in the
message; a copy there would be written into the one place the boundary
erases.

## When to Activate

- **A session opens** — fresh, resumed, cleared, or continuing after a
  compaction — and `.agent/progress.md` has open items. A companion hook
  says so (count and age, never the text); re-open the file before
  substantive work.
- **A turn leaves residue** — a part closed as blocked or returned, a next
  action that a later session must not lose — and the work will outlive this
  session. Write or update the ledger in that turn, not "at the end".
- **A companion hook reports** that your previous turn edited files and
  left a ledger with open items untouched.
- **A companion hook hands back something you wrote you would do** - "I'll
  update the docs once the tests pass", two turns ago - and asks what became
  of it.

Not on every task. A one-turn answer, a change that ships inside the session
with nothing left open, a project with no ledger and nothing to put in one:
silence is correct, and a ledger with nothing open is a file to leave alone.

## Core Protocol

1. **Re-open before you work.** When the ledger has open items, read it
   before touching code. Each open item is one of three things this session:
   *carried* (still blocked or returned — leave it, say so), *moved* (the
   block lifted, the owner decided — do the work, then close it), or
   *closed* (done; remove it from `## Open`). Do not re-derive any of this
   from the code: the code shows what exists, not why it stopped there.

2. **Residue only.** The ledger holds what the next session cannot recover
   from the code and the plan: open items with their **observed** reason,
   and the next action. Not the plan (point at it), not the parts that are
   done (they are in the code and in git), not a narrative of the session.
   A ledger that restates the plan is a second plan that will drift from the
   first.

3. **The two open states are coverage's.** `blocked` — an observed limit:
   a missing credential, a failing gate, a dependency not there. `returned` —
   the owner's call: two non-equivalent options and picking one is theirs.
   Each with the reason after the colon, as the coverage skill closes a
   part. There is no third state; "abandoned", "deferred", "later" are
   either a `returned` with the reason, or a part being dropped in silence.

4. **Write it in the turn that produced it.** The turn that hit the limit
   knows the limit; the next session only knows the file. A ledger written
   from memory at the end of a session is the transcript again, one step
   removed.

5. **Keep it current, then keep it small.** Change `Updated` when you
   change the file. A closed item is **removed** — not ticked, not struck
   through, not moved to a `## Done` or `## Closed` section. What was done
   is in the code and in git; the ledger records only what is not. A
   checkbox is decoration the hook ignores; an item under `## Open` is open.
   `Next` is one line, in the imperative, for a reader who has only this
   file. A companion hook says when the file has outgrown a page — more than
   eight open items, or more than forty lines — and the answer is to prune,
   not to add a heading.

6. **Answer the sweep with the quote, not with a feeling.** "Is there
   anything I might be forgetting?" cannot be answered from inside the turn:
   there is no memory to search, only the context already in view, and a
   bare "no, that is everything" comes out as fluently as anything else. So
   the question arrives with its inventory attached — the one list you cannot
   re-read, the things you wrote you would do later in this session — quoted
   back two turns on. For each: it is **done** (say what shows it), or it is
   residue for a later session (put it under `## Open` as `blocked` or
   `returned`, with the reason), or it is **dropped** (say why — "the tests
   covered it", "the owner cut it"). What is not an answer: "I believe that
   is covered." The quote is there so the answer is about that line.

## Progress failure signatures

- **The greenfield restart** — a new session implements a part that the
  last one finished or returned, because nothing in context said so.
- **The re-derived reason** — "this must have been left because…": the
  observed reason was in the last session's trace and is now a guess. A
  `blocked:` line with the reason on it is one sentence that saves a
  session of archaeology.
- **The ledger as diary** — a session log with dates and paragraphs. The
  next session needs three things, not a story.
- **The ledger as archive** — a `## Done` section that only ever grows. Every
  closed item left in the file is a line the next session reads to learn
  nothing; a ledger closed by marking instead of removing is unbounded by
  construction. Remove it; git remembers.
- **The stale ledger** — open items from a week ago next to a codebase that
  moved on. Once the ledger has been stale for a while, the hook stops
  announcing it — better to be silent than to keep pointing at an untended
  file — so a ledger you keep, you keep current.
- **The ledger in the message** — a `[PROGRESS]` block in the reply and no
  file. The reply is what the boundary drops.
- **The forgotten promise** — "I'll add the tests after this" in turn 3,
  the session ends in turn 7 with no tests and no word about them. The
  promise was in the one place the agent does not re-read: its own earlier
  message. When the sweep hands it back, the answer is done, ledger, or
  dropped with a reason — never "I think that was covered".

## Integration

**The file:** `.agent/progress.md`, relative to the project root. Host
neutral on purpose: not under `.claude/` or `.cursor/`, so every host that
loads this skill finds the same file. Markdown, a page at most:

```
# Progress

Updated: 2026-09-20
Plan: docs/PLAN-auth.md

## Open
- blocked: auth callback returns 401 against staging - AUTH_SECRET is not set there, owner has the vault
- returned: openapi regen - codegen 6 vs 7 changes the client's error types, owner picks

Next: once AUTH_SECRET is set, run `npm run smoke` and close the auth item.
```

- `Updated:` — a date. Not a session id: that is noise in a versioned file.
- `Plan:` — optional, one line, the artifact executive-self-monitoring
  anchors to. A pointer, never a restatement.
- `## Open` — exactly this heading, level two. The section ends at the next
  heading. Only `- blocked: <reason>` and `- returned: <reason>` lines under
  it are open items; `done` lines, prose and bullets elsewhere are not
  counted. Bullet style, a checkbox, bold on the field name, capitalisation
  and indentation are all read as the same line — the vocabulary is
  strict, the formatting is not.
- `Next:` — one line.

**Write it with your ordinary file tools.** No hook writes this file, and no
hook reads more of it than the open-item count and its age. Nothing in it
travels anywhere.

**Do not announce the ledger.** No "per the progress skill, I have updated
the file". Update it; the next session will read it. If something in this
turn moved an open item, the message says what moved and the ledger says
what is still open — the same fact, in two places for two readers.

**Boundaries.**
- The **plan** — executive-self-monitoring — says what the work is and what
  its gate is. `Plan:` points at it; the ledger never copies it.
- The **parts** of the current request — coverage-self-monitoring — are
  closed in the `[COVERAGE CHECK]` at the end of the turn. What that check
  leaves `blocked` or `returned`, and this session will not resolve, is what
  goes under `## Open`. The vocabulary is shared so the two agree.
- The **reader** of this turn — handoff-self-monitoring — gets the
  `[HANDOFF]` block in the message: the fork, the default, the next action
  for *them*. `Next:` in the ledger is the next action for the *next
  session*. When they are the same, write it twice; they are read at
  different times by different readers.
- A **stop** that names "the next session" as its reason —
  termination-self-monitoring — is still a stop on a phrase unless the
  ledger says what is blocked and by what. The ledger records the checkable
  reason; it does not manufacture one.
