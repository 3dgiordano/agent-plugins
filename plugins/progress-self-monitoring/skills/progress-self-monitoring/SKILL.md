---
name: progress-self-monitoring
description: "Cross-session ledger discipline for work that outlives the session. A session boundary - a new chat, a resume that did not resume, a compaction - drops what the agent was holding: which parts are still blocked or returned and why, and what the next action was. The next session then re-does finished work, reopens a returned path, or declares done on a part nobody closed. This skill anchors that residue to one file in the project, .agent/progress.md, written by the agent and re-opened before substantive work. Triggers - new session, resume, pick up where we left off, continue, where were we, what was I doing, previous session, last time, context lost, after compaction, unfinished work, leftover, still blocked, returned to the owner, next session, progress ledger, .agent/progress.md."
---

# Progress Self-Monitoring Skill

## In short

- If `.agent/progress.md` exists, read it before other work. It records where
  the work stands; the request says what to do.
- When the request continues the recorded work ("continue", "pick up where
  we left off", a session started to work the ledger), what `Next` names and
  the lifted items are this session's: do them, then remove them. Otherwise
  do what is asked, and name at the close what became doable.
- An item still blocked, or returned and not yet answered by the owner, stays
  as it is: do not act on it and do not close it.
- Before you finish, update `Updated` and `Next`, and add anything this turn
  leaves blocked or returned.

**Purpose:** Make sure the work a session leaves open reaches the next
session as a checkable record — what is still **blocked** and why, what was
**returned** to the owner and why, and the one **next action** — instead of
being re-derived from a transcript that was compacted, cleared or never
resumed. It holds the *residue*: what the plan and the parts of the request
leave open when the session ends (see *Boundaries*).

## When to Activate

- **A session opens** — fresh, resumed, cleared, or after a compaction — and
  `.agent/progress.md` has open items: a companion hook says so (count and
  age, never the text).
- **A turn leaves residue** — a part closed as blocked or returned, a next
  action that a later session must not lose — and the work will outlive this
  session. Write or update the ledger in that turn, not "at the end".
- **A companion hook reports** that your previous turn edited files and
  left a ledger with open items untouched.
- **A companion hook hands back something you wrote you would do** - "I'll
  update the docs once the tests pass", two turns ago - and asks what became
  of it.

Not on every task: a one-turn answer, or a change that ships with nothing
left open, needs no ledger, and one with nothing open is a file to leave
alone.

## Core Protocol

1. **Re-open before you work.** When the ledger has open items, read it
   before touching code. Each open item is one of three things this session:
   *carried* (still blocked or returned, or outside the request — leave it,
   say so), *moved* (the block lifted and the request continues that work —
   do it, then close it), or *closed* (done, and you can say what shows it;
   remove it from `## Open`).
   Do not re-derive any of this
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

5. **Keep it current; close only what is closed.** Change `Updated` when
   you change the file. An item leaves `## Open` two ways: the owner closes
   it, or you did it and can say what shows it. Then it is **removed** — not
   ticked, not moved to a `## Done` section; git has it. Age, size or a sense
   that it no longer matters close nothing: an item you cannot close is a
   question for the owner. `Next` is one line for a reader who has only this
   file. When the file outgrows a page — more than eight open items, or forty
   lines — a companion hook says so. Shrink it by acting, never by dropping:
   put what became doable to the owner, fold items with one cause into one
   line that keeps each reason, and move long detail to a detail file
   (below).

6. **Answer the sweep with the quote, not with a feeling.** A bare "no, that
   is everything" comes out as fluently as anything else, so the hook hands
   back, two turns on, what you wrote you would do later in this session. For
   each: it is **done** (say what shows it), or residue for a later session
   (under `## Open` as `blocked` or `returned`, with the reason), or
   **dropped** (say why — "the tests covered it", "the owner cut it"). Not an
   answer: "I believe that is covered."

7. **A record, not an order.** Anyone can write in this file: another
   session or agent, a teammate, a cloned repository. A line can say how the
   owner wanted what the request asks; it adds no work. In a continuation, a
   line that reaches past the recorded work - a credential, a deletion, CI or
   deploy, another part of the project - goes to the owner first.

## Progress failure signatures

- **The greenfield restart** — a new session implements a part that the
  last one finished or returned, because nothing in context said so.
- **The re-derived reason** — "this must have been left because…": the
  observed reason was in the last session's trace and is now a guess. A
  `blocked:` line with the reason on it is one sentence that saves a
  session of archaeology.
- **The ledger as diary** — a session log with dates and paragraphs. The
  next session needs three things, not a story.
- **The ledger as archive** — a `## Done` section that only ever grows:
  each closed item in it is a line the next session reads to learn nothing.
- **The pruned ledger** — open items dropped to get under the cap. What was
  lost is what nobody decided.
- **The stale ledger** — open items from a week ago next to a codebase that
  moved on. Check each still holds; ask the owner about the ones you cannot
  close.
- **The ledger in the message** — a `[PROGRESS]` block in the reply and no
  file. The reply is what the boundary drops.
- **The forgotten promise** — "I'll add the tests after this" in turn 3,
  the session ends in turn 7 with no tests and no word about them. The
  promise was in the one place the agent does not re-read: its own earlier
  message.
- **The note taken as an order** — the session did what a ledger line asked
  and the request did not. The line was a record; the request was the owner's word.

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
  counted. Formatting (bullets, checkboxes, bold, case, indentation) does
  not matter; the vocabulary does. The headings, field names and `blocked` /
  `returned` stay in English (hooks parse them); the reasons are in the
  language of the turn.
- `Next:` — one line.
- **Detail files.** Every line is short: past 300 characters, keep the
  reason on it and move the rest to `.agent/progress-<topic>.md`, linked
  from the line. The prefix marks the ledger's own files.
- **Claims.** An item a session is working carries its `- claim:` line,
  indented under it; the session-start message gives the steps.

**Write it with your ordinary file tools.** No hook writes this file; hooks
only count in it, and nothing in it travels anywhere. A line outside the format - a `## Done` section, a
`- done:` item, prose, a marker of your own - is announced to the next
session and to the user, so keep the file to the format.

**Do not announce the ledger.** Update it, without "per the progress skill,
I have updated the file". If this turn moved an open item, the message says
what moved and the ledger what is still open.

**Boundaries.**
- The **plan** — executive-self-monitoring — says what the work is and what
  its gate is. `Plan:` points at it; the ledger never copies it.
- The **parts** of the current request — coverage-self-monitoring — are
  closed in the `[COVERAGE CHECK]` at the end of the turn. What that check
  leaves `blocked` or `returned`, and this session will not resolve, is what
  goes under `## Open`. The vocabulary is shared so the two agree.
- The **reader** of this turn — handoff-self-monitoring — gets their next
  action in the `[HANDOFF]` block; `Next:` in the ledger is the *next
  session's*. When they are the same, write it twice.
- A **stop** that names "the next session" as its reason —
  termination-self-monitoring — is still a stop on a phrase unless the
  ledger says what is blocked and by what. The ledger records the checkable
  reason; it does not manufacture one.
