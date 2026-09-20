---
name: handoff-self-monitoring
description: "Structured-handoff discipline for the final message of a turn. An agent that knows the state, the problem and the open decision writes its close in the register of its own trace - paths, identifiers, what it ran - and the reader, who has only the message, cannot tell what to decide or what to do next. This skill anchors the close to a [HANDOFF] block modelled on the SBAR and I-PASS handoff protocols: status first, the situation in the reader's terms, the fork as options with a default, one action asked of the reader. Not a blocker - a format. Triggers - offer to the reader, unnamed fork, closing question, reader cannot act, final message, closing the turn, wrapping up, summary, next steps, let me know, if you want, would you like me to, should I, up to you, your call, depends on, alternatively, two options, trade-off, what do you think, returned to the owner, handoff, report back."
---

# Handoff Self-Monitoring Skill

**Purpose:** Make sure that when a turn ends, the reader can act on the
message — see where the work stands, see what has to be decided, see what to
do next — without reading your trace. The epistemic-self-monitoring skill
covers whether what you concluded is true; this one covers whether what you
concluded reached the reader in a form they can use.

**Key idea:** you have the whole trace; the reader has the message. The paths
you read, the commands you ran, the names of the things that failed are
transparent to you because you just saw them, and opaque to a reader who did
not. The close is sampled from that context, in its register, with the same
fluency as everything else: a narrative of what you did, in your terms, ending
where the work ended rather than where the reader has to pick it up. The
literature names the mechanism — the **curse of knowledge** and the expert
blind spot, the **illusion of transparency**, **writer-based prose** — and it
names the remedy, which is not "explain better". It is a fixed handoff format
with the recommendation as a mandatory field: nursing and aviation use
**SBAR** (Situation, Background, Assessment, Recommendation), medicine uses
**I-PASS** (Illness severity, Patient summary, Action list, Situation
awareness, Synthesis by receiver). Both exist because free-form handoff by
someone who knows the state failed in exactly this way. The `[HANDOFF]` block
is that format for an agent's turn:

| SBAR | I-PASS | `[HANDOFF]` |
|------|--------|-------------|
| Situation | Illness severity | `Status` — one word the reader triages on |
| Background | Patient summary | `Situation` — what the reader has now, in their terms; the trace-register detail goes *below* the block |
| Assessment | Situation awareness / contingency | `Options` with a default, or `Blocked-by` |
| Recommendation | Action list | `Next` — the one action asked of the reader |
| — | Synthesis by receiver | the reader's reply; a hook cannot do it for them |

## When to Activate

- You are about to write the final message of a turn.
- Something in the turn is the owner's to decide: two non-equivalent options,
  a choice of scope, an ambiguity you resolved by assumption, a risk you did
  not take.
- The close is an **offer**: the assessment is handed to the reader as a
  favour. In English that often looks like "let me know", "if you want",
  "would you like me to", "should I", "up to you".
- The close is a **fork**: two non-equivalent paths are named without options,
  consequences and a default. In English: "it depends on", "alternatively",
  "two options".
- The close is a **question to the reader** — a `?` in the last lines, in any
  language.
- The coverage-self-monitoring ledger has a `returned` part.
- A companion hook reports that the turn is closing (a green gate, a commit),
  or that your previous close named a decision without formulating it.

## Core Protocol

1. **Status first.** `done`, `needs-decision` or `blocked` — one of three.
   I-PASS opens with a one-word severity for the same reason: the reader
   triages on it before reading anything else. "Mostly done", "done except",
   "basically works" are not statuses; they are `needs-decision` or
   `blocked` with the reason not yet written.

   Neither is what you *did* a status. "Reviewed", "Analysed", "Investigated"
   name the activity, and the reader triages on what they must do, not on what
   you have been doing. An assessment that hands back a choice is
   `needs-decision`; one that asks nothing of the reader is `done`. This is the
   measured failure mode on review turns — the agent writes
   `Status: Reviewed; <the finding>`, having already laid out `Options` and
   `Next` correctly below it, so the block is a `needs-decision` in everything
   but the word. The pull is real: the finding *is* the most important thing on
   the page. It goes in `Situation`, which is the slot for it. `Status` is the
   triage word, and it is worth more to the reader precisely because it is one
   of three and they never have to read it twice.

2. **The situation, in the reader's terms.** One sentence: what the reader has
   now that they did not have before. Test each word — would it mean
   anything to someone who did not see the tool calls? A path, a function
   name, a flag, an error code is trace register; *"the login form now
   rejects an empty password, and the test for it is green"* is reader
   register. The trace-register detail goes after the block, for the reader
   who wants it.

3. **A fork is written as a decision, not offered as a favour.** An offer
   hands the assessment to the reader — in English, *"I can also add retries
   if you'd like"*; the act is the same in any language. A decision has the
   options, non-equivalent, each with its consequence **on its own line**; a
   default on its own line; and why the default. If you cannot name a
   default, the assessment is not finished: finish it, then write. If the
   options are equivalent there is no decision — pick one and say so.

4. **Ask for one action.** `Next` is one thing the reader does: answer A or
   B, run this command, review this file, nothing. Not an open-ended ask (in
   English, "let me know your thoughts"). When the status is `done` and
   nothing is asked, write `Next: nothing` — the explicit nothing is what
   tells the reader the turn is closed and they are not waiting for anything.

5. **Blocked means observed.** Same rule as the coverage-self-monitoring
   skill: `blocked` carries the observed limit and the tool that showed it.
   A `blocked` with no observation is a `needs-decision`, or a
   termination-self-monitoring case — test the reason there.

6. **The block is the close, not an appendix.** Put it where the reader will
   read it: at the end, after the detail, or first when the message is long.
   Everything outside it may be trace register; nothing inside it may.

## Handoff failure signatures

- **The process narrative** — *"I read X, changed Y, ran Z, it passed"*: a
  log, not a handoff; where the reader stands is left for them to infer.
- **The offer instead of the decision** — *"I can also add retries if you'd
  like"*: the assessment has been handed to the reader.
- **The trailing question** — a message that ends on *"does that look
  right?"* or *"which do you prefer?"* with no options and no default.
- **The buried fork** — the decision sits in paragraph three, in a
  subordinate clause: *"…which assumes the API is idempotent"*.
- **The one-line fork** — Options packed with `|` so the choice is a
  horizontal scroll. One option per line; `Default` on its own line.
- **The fenced block** — wrapping `[HANDOFF]` in a code fence. Fences do
  not wrap; the reader has to scroll. Write it as a markdown list.
- **Done except** — *"done, except the migration still needs…"*: that is
  `needs-decision` or `blocked` with the reason not yet written.
- **The identifier close** — *"Fixed in `resolveConfig`, see
  `lib/config.js:88`"* with no line about what changed for the reader.
- **The absent nothing** — done, no ask, no line saying so: the reader waits
  for something that is not coming.

## Integration

Write the block at the close of the turn, **as a markdown list in the
message, not inside a fenced code block**. Fences do not wrap; a long
`Options` line becomes a horizontal scroll. Companion hooks read it; on
hosts without hooks it is still the artifact that makes the handoff visible
to the reader. Block field names stay in English (hooks parse them);
`Situation`, `Options` and `Next` are in the language of the turn.

**Write the block. Do not announce writing it.** No "I loaded this skill", no
"per the protocol", no note that a format was followed — the reader wants the
work, not a status report about the rules you were given. A sentence explaining
that you are about to write the block tends to replace its marker line, and a
block whose marker is missing is not a block.


[HANDOFF]
- Status: done | needs-decision | blocked
- Situation: <what the reader has now, in their terms - one sentence>
- Options:   *(needs-decision — one alternative per line)*
  - A: <choice> — <consequence>
  - B: <choice> — <consequence>
- Default: A, because <why>   *(needs-decision)*
- Blocked-by: <the observed limit, and the tool that showed it>   *(blocked)*
- Next: <the one action asked of the reader, or: nothing>

Rules the hooks check:
- `Status` is one of the three.
- `needs-decision` **requires** `Options` with at least two alternatives
  (a list under `Options`, not a `|`-separated line) and a `Default` (own
  line, or trailing on `Options`).
- `blocked` **requires** `Blocked-by`.
- `Situation` and `Next` are required; a template placeholder counts as
  empty.
- No blank line inside the block — the scanner stops at the first one.
- The act — an offer, a fork, a question to the reader, or a `returned` part
  in a `[COVERAGE CHECK]` — with no `[HANDOFF]` block is the finding.
  Companion hooks also scan an English lexicon for offer/fork language as a
  backstop.

Keep it short. The value is in the reader being able to act — status,
situation, the choice with a default, one action — not in the ceremony.
The scanner still accepts a one-line `Options: A | B` from older closes;
do not write that form.
