# What to do with an eval result

A behavioural eval is not a grade. Every number it produces is a claim about
where a plugin's discipline stops reaching the output, and each shape of result
points at a different place to fix. This is the loop from a run to a change and
back.

Run the eval with `scripts/claude-eval.js` or `scripts/cursor-eval.js`. Probe
before any batch: `--probe`, then one case at low `n`, then the full run. A
configuration defect makes every number in a batch worthless, and that has
already happened four times — a truncated prompt, a shared workspace leaking
one arm into the other, a permission mode that made the case unmeasurable, a
scanner that did not recognise its own block.

## Read the result as one of four shapes

| with | without | What it means | Where to look |
|---|---|---|---|
| 0% | 0% | The discipline never reached the output | Delivery: did the hook fire? was the skill available? is the case even runnable in this permission mode? |
| high | high | The case does not discriminate | The **prompt**: the model does this unaided, so the case measures the baseline, not the plugin |
| high | 0% | Working as intended | Nothing — record it |
| **partial** | 0% | **The instruction is not clear enough** | The **instruction**: skill text and injected message |

The fourth row is the interesting one, and the easiest to waste.

## A partial score is a controlled experiment, not noise

When a case scores 33% or 50%, the runs that scored and the runs that did not
share everything — same prompt, same plugin, same mode — and disagree anyway.
That disagreement is free evidence about what the instruction failed to pin
down. **Read the diverging transcripts before reporting the number.** Raising
`n` resolves whether an effect exists; it does not tell you what to change, and
averaging over the disagreement throws away the most actionable thing the run
produced.

Name the difference in one sentence. If you cannot, read more transcripts
rather than reporting a percentage.

## Where a fix belongs

Three places, in order of preference:

1. **The injected message** (`lib/messages.js`) — it reaches the agent whether
   or not the skill is invoked, so it is the strongest lever and the cheapest
   to test.
2. **The skill** (`skills/*/SKILL.md`) — for the protocol itself, the reasoning,
   the failure signatures.
3. **The scanner** (`lib/*.js`) — only when the agent did the right thing in a
   form the scanner should have accepted. Loosening a scanner to match one
   transcript is overfitting; the corpus is what keeps that honest.

Never fix a partial score by loosening the grader. If the grader is wrong, it
is wrong for a reason you can state without reference to the transcripts that
failed.

## Every fix is a hypothesis

A change to an instruction is a claim that the rate will go up. Re-run the same
case, same `n`, and compare. If it does not move, revert it rather than keeping
a change that sounded right. Record the before and after in the CHANGELOG entry.

Do not change an instruction while a batch is running: the comparison needs the
same text on both sides.

## Known improvement classes

These came out of real runs. Check a new deviation against them first.

### The marker is treated as notation, not as a literal token

**Observed:** the coverage case scored 33–50% across runs. The transcripts that
failed carried the whole discipline — every part enumerated, each closed as
done — under `**Coverage check**` instead of `**[COVERAGE CHECK]**`. The agent
applied the protocol and dropped the one token the scanner reads.

**Why:** the messages say *"write the [COVERAGE LEDGER] as a markdown list, not
a fenced code block"*. They warn against fences and never say the brackets are
literal, so the marker reads as the instruction's own notation for naming a
thing rather than as text to reproduce.

**The fix class:** state that the marker is copied verbatim, brackets included,
and show it rather than describing it. An instruction that names a format
without showing one leaves the form to the agent's judgement.

### The agent narrates its compliance

**Observed:** nine transcripts opened with a sentence about the session's
constraints — *"I don't have shell execution permission in this session, so I
can't run the file to verify it directly"* — and fourteen closed on an offer
(*"let me know if you'd like…"*, *"grant shell access so I can verify"*).

**Why:** nothing in the instructions tells the agent not to. A model that has
been given a format tends to report having followed it, and a model under a
restriction tends to explain the restriction back.

**The fix class:** the instructions should say to *follow* the format, not to
announce following it — no preamble about the block, no note that a constraint
prevented something unless that constraint is the finding. The reader wants the
work, not a status report about the rules the agent was given.

## Recording the outcome

An eval run that changes nothing still produced knowledge. Put it where the
next person will find it:

- a case that does not discriminate gets a `NOTES.md` beside its `prompt.md`,
  saying what was ruled out and why the prompt is what needs replacing;
- a fix gets its before/after rate in the CHANGELOG entry;
- a deviation you chose not to fix gets a line here, under its class.

## Known improvement classes, continued

### The trigger cannot be evaluated when the message arrives

The load messages are injected at `UserPromptSubmit`. A trigger phrased around
the agent's own close — *"before you close a turn"*, *"when your close would
leave them a choice"*, *"when your close carries a decision"* — scored 0, 0 and
1-of-4, because at the moment the message lands there is no close to match
against, and the agent does not revisit the message later in the turn. The
fourth phrasing asked about the ASK instead, which is readable off the prompt,
and scored 3-of-3.

Before rewording an underperforming trigger, ask first whether the agent could
decide it on arrival.

### The trigger names the act that goes wrong

An agent that behaves well never performs that act, so the instruction excludes
exactly the turns the block is worth writing on. *"Before trying again after
something already failed"* missed every run in which the agent correctly
decided **not** to try again. Phrase the trigger as the situation the turn
arrives in, which holds whichever way the next move goes.

### The skill, not the message, is the authority

Since the messages became pointers, the condition that decides is the one in
the skill. Persistence's trigger was rewritten twice in `lib/messages.js` while
`SKILL.md` still listed four activation conditions that were all about the
agent's own loop — a hook count, *you* about to retry, *your* quick fix growing,
*you* fighting the tooling. None covered the commonest real shape: the owner
arrives already in the loop. Fix the skill first, then make the message point
at it.

### The block is crowded out by a caveat about the environment

A message that opens with *"search is blocked here"*, *"Bash is denied in this
session"* or *"there is no project checked out"* tends to go straight to the
answer with no block at all. The caveat is worth making — it tells the reader
what could not be verified — but placed first it takes the block's position.

## The baseline, 2026-09-20

Twelve cases, six plugins, two axes, both hosts. `n=3` per arm except where
noted. Every case's most recent transcripts, scored by the grading core as it
stands.

| plugin | Claude Code: due | Claude Code: not due | Cursor: due | Cursor: not due |
|---|---|---|---|---|
| coverage | 100% | cost 0 | 100% | cost 0 |
| epistemic | 100% | cost 0 | 100% | cost 0 |
| executive | 100% | cost 0 | 100% | cost 0 |
| handoff | 100% (n=5) | cost 0 | 100% | cost 0 |
| persistence | 100% | cost 0 | 100% | cost 0 |
| termination | 100% | cost 0 | 100% | cost 0 |

The two hosts are not measuring the same thing. On Claude Code the hooks fire
under `-p`, so the WITH arm gets hooks AND skill. The Cursor CLI does not run
hooks headless, so there the WITH arm is the skill alone, reached because the
agent decided to load it from its own description. Both reach 100%, which is
the single most useful fact here for what comes next: the skills carry the
discipline without the injected message pushing them.

### What this is not

- `n=3` cannot separate 100% from 85%. The handoff case was taken to `n=5`
  because it had already produced 1-of-1 and then 0-of-3 on one configuration;
  every other cell is three runs.
- One case does not cover an axis. It opens one.
- **The Cursor column crosses two CLI builds.** Eight cases were measured on
  `2026.09.15-d2fe57e` and four on `2026.09.18-9a7762b`, which the CLI updated
  itself to mid-session. Both baselines fell across that boundary at the same
  time as the two prompts were replaced, so the drop cannot be attributed to
  the prompts alone. The WITH arm read 100% on both builds.
- A `quiet` case scoring `cost 0` says the block stayed away on **that** turn,
  not that the collection is silent generally.

### What it is for

A line to migrate against. The next change is moving the static content out of
the injected messages and into sections of the skills, and that is only
assessable against a baseline where every case already passes on both hosts.

### How to re-check it cheaply

`node scripts/claude-eval.js --rescore <dir>` re-grades transcripts already on
disk, with no calls. When the grading core changes, rescore before re-running:
two of the numbers above were recovered that way rather than bought.

The case filter takes a comma-separated list of plugin names or case ids, so a
question that concerns two cases costs two cases.

### The scanner refuses the discipline over formatting

Four times now, and each looked like the plugin failing:

- coverage read `- enqueue(item) — done` as no part line, because it wanted a
  colon;
- executive read `Decision: continue, scoped strictly to steps 1-2` as no
  decision, because a qualifier was allowed after a dash but not a comma;
- every scanner read `**[HANDOFF]**` as no block, because the marker had to be
  bare;
- every scanner read `- **Status:** done` as a field present and empty, because
  the field name had to be bare.

The last is the worst shape: a block that parses but comes out empty is graded
worse than no block, and it produces a retrospective accusing a correct close of
writing nothing. Before concluding that an agent did not follow the protocol,
paste what it wrote into the scanner and look at the violations. And when a
field name is matched in more than one place — `field()`, a line classifier, a
section finder — fixing one of them fixes one of them.

The eval will not catch this class on its own. Twelve cases reached 100% on two
hosts while this was live, because those agents happened to write their fields
plain. A corpus line will: `handoff-close` caught the `__` variant that the
hand-written test missed, because the test author decorated the shapes he
thought of and the corpus holds the shapes that showed up.
