# FAQ: what these plugins are, and what they are not

Short answers to the questions people ask first, and to the assumptions that are easy to make and wrong. For the design, see [HOW-IT-WORKS.md](HOW-IT-WORKS.md); for what has been measured, [EVIDENCE.md](EVIDENCE.md); for the research, [RESEARCH.md](RESEARCH.md).

## What they are not

### Is this a framework?

**No.** It is eight independent plugins. Each is a skill (a working discipline the agent loads) plus, where the host allows it, a few hooks that put a concrete fact in front of the agent at the moment it matters. You install the ones you want; they do not replace your agent, your prompts or your workflow. The repository also holds the bench that measures them.

### Is this a guardrail, a sandbox or a security tool?

**No.** The plugins do not stop an agent from doing anything. They never block by default (three have an opt-in gate, below), they do not restrict commands, files or network access, and they do not protect your machine. To limit what an agent can do, use your host's permission settings or real isolation: a container, a VM, a separate user.

The repository's bench does fence the agent it tests: its shell admits only `node`, and that `node` runs under Node's permission model, confined to the run's workspace, with what it refuses recorded. The agent's other tools are audited afterwards, and a run that touched anything outside its workspace is dropped. That is the **test harness**, there to keep measurements honest ([bench/GUARDS.md](../bench/GUARDS.md)). None of it is installed with a plugin.

### "Self-monitoring": does it monitor the agent, or me?

**Neither, in the surveillance sense.** *Self*-monitoring means the agent checks its own work, the way an engineer re-reads the plan before the next step. Nothing is sent anywhere, nothing is scored, nothing is reported to anyone. The hooks read a count or a file and tell the agent; the agent writes its answer where you can read it.

It is designed that way on purpose. Research on agents shows that the sense of being watched or tested changes their behaviour, and that pressure on monitored reasoning teaches models to hide it ([HOW-IT-WORKS.md](HOW-IT-WORKS.md#why-the-checks-are-the-agents-own)). So the plugins never judge, punish or report, and their messages describe the work, not an examiner.

### Do they detect cheating or bad behaviour?

**Not as a judge.** The hooks notice simple facts (a count, a phrase, a code shape) and remind the agent at that moment. They do not decide whether the agent is right, and they report the agent to no one. The integrity plugin comes closest: it names an edit that answers a failed call with a made-up value, then asks the agent to say whether that was intended.

### Do they make the model smarter?

**No.** They add no knowledge or capability. They put two things in front of the agent at the right moment: a fact it was not tracking, and a format for its answer with named options, including the honest ones ("blocked", "cannot be done as asked, because X"). The aim is better *decisions* with the same model.

### Do the detectors catch every case?

**No, and they do not need to.** They are simple on purpose: counters and pattern matching. The skill carries the full discipline and the load message carries the block's shape; a detector only decides when to repeat the reminder. (Six plugins put their skill in context at the start of the session; for the other four the message is most of it: [HOW-IT-WORKS.md](HOW-IT-WORKS.md#three-parts-three-jobs).) Their accuracy on real lines is tracked in CI, and their blind spots are listed in [EVIDENCE.md](EVIDENCE.md#the-detectors-the-triggers).

## Does it work?

### Is there evidence they improve results?

**Exploratory results are published, with their dates, sample sizes and intervals; no confirmatory study has run yet** ([STUDY-PROTOCOL.md](STUDY-PROTOCOL.md)). On Claude Code, runs with a plugin passed 60 of 72 graded tasks (73-90%) against 41 of 72 without (45-68%; three models, n=3, 2026-09-27). The gain comes from three plugins (progress, executive, integrity); on the others the unaided models already pass, or the case does not measure the plugin. On Cursor the same design helped both Grok models strongly and Composer 2.5 little. The cases are written by the plugins' author, and the bench is still being built. [EVIDENCE.md](EVIDENCE.md) says exactly what is known and what is not.

### Do they work because the agent thinks it is being watched?

That is the explanation the project designs against, and part of it is measured. The bench hides its setup and counts, per arm, how often the agent talks about being evaluated. In 144 Claude Code runs on the current versions, none left its workspace and none said, in what it wrote, that it was being tested (its reasoning is redacted in these logs, so that count covers its words, not its thoughts). On Cursor, where the reasoning is visible, runs with a plugin talked about being evaluated more often than runs without (18 of 63 against 10 of 63, 2026-09-23, earlier versions); the messages have been rewritten since, and that is not re-measured yet. Whether the effect comes from the evidence and the format rather than from any reminder at all is what the planned placebo arm answers ([EVIDENCE.md](EVIDENCE.md#what-would-settle-it)).

### Can a plugin make things worse?

Yes, and when it has, it is recorded. One field list in persistence's first message made Opus 5's safeguards stop 11 of 12 runs; it was removed. A block can also be written as a ritual, from memory. Every case is found by measuring, and every plugin version change invalidates its stored results ([EVIDENCE.md](EVIDENCE.md#plugins-can-also-hurt)).

## What they are

### So what do I actually get?

Short, structured blocks in the agent's replies that tell you, at the moments that matter:

- whether it is still on the plan (`[PLAN CHECK]`)
- whether a claim was observed or guessed (`[EPISTEMIC CLOSE]`)
- why it is trying again, or why it stopped trying (`[PERSISTENCE CHECK]`)
- whether its reason to stop is real (`[TERMINATION CHECK]`)
- which parts are done, blocked or returned to you (`[COVERAGE CHECK]`)
- what state the work is in and what it needs from you (`[HANDOFF]`)
- what is left for the next session (`.agent/progress.md`)
- whether a result is real or a stand-in (`[INTEGRITY CHECK]`)

The blocks follow a fixed format with English field names, so a person, a reviewer or another agent reads them the same way every time. The fields of each block are in [HOW-IT-WORKS.md](HOW-IT-WORKS.md#the-block-where-a-decision-becomes-visible).

### Which plugin should I start with?

Pick by the problem you see most:

| If your agent... | Try |
| --- | --- |
| keeps retrying the same fix | persistence |
| stops early with "running out of context" or "let's continue later" | termination |
| calls the work done without reviewing the result against what was asked - reading the document, viewing the image, running the code | aspiration |
| wanders off the plan or the spec, or works from an old version of it | executive |
| states causes or facts it did not check | epistemic |
| fixes the bug and also changes a function you did not mention, "for consistency" | hygiene |
| leaves TODOs or skips the hard part | coverage |
| ends with a wall of text you cannot act on | handoff |
| loses track of open work between sessions | progress |
| ships mocks or fallbacks that look like real results | integrity |

They install independently; add more later.

## Practical questions

### Will they slow the agent down or fill its context?

A little, and it is measured. On Claude Code, one plugin added between 1 and 15 seconds and a few hundred tokens per task (EVIDENCE.md, "Cost"). The context cost is the skill: handoff, progress, coverage, executive, hygiene and aspiration put theirs in context at the start of every session and after a compaction (about 9,000 characters each, 5,400 for executive and 5,000 for hygiene; handoff, coverage and hygiene also in every subagent), the other four only when the agent loads them. Then one line each time a trigger fires, and the block the agent writes. The cost of all ten installed together is not measured yet. To see how often a trigger would fire on your own work, set the `*_LOG` variables and run `node scripts/calibrate.js`.

### Do they send my code anywhere?

**No.** No network, no telemetry, no dependencies. Per-session counters live in the OS temp directory. Debug logs are off unless you turn them on, and then stay inside your project. Three plugins read a file in your project, and none repeats its contents ([SECURITY.md](../SECURITY.md)).

### Can they block my agent?

Only if you ask. Five plugins have an opt-in strict gate (`EPIMON_STRICT`, `TERMMON_STRICT`, `HANDMON_STRICT`, `ASPMON_STRICT`, `HYGMON_STRICT`), and each blocks once, never in a loop. Any error inside a hook lets the agent continue.

### Can I turn off the notices?

Yes, per plugin: `PERSISTMON_NOTICE=0`, `TERMMON_NOTICE=0`, `EPIMON_NOTICE=0`, `COVMON_NOTICE=0`, `HANDMON_NOTICE=0`, `PROGRESSMON_NOTICE=0` and `INTMON_NOTICE=0`. The agent still gets its reminder; you stop seeing the one-line notice. Notices appear on Claude Code and Codex only.

### Does it work in languages other than English?

The skills and the blocks work in any language; field names and status words stay in English by design. The detectors read English best and some Spanish; a reason or a deferral written in another language may not trigger a reminder.

### Does it work the same on every host?

The skill is the same everywhere. Claude Code and Codex get every hook. Cursor gets fewer (it has no event to remind the agent after its final message), and other Agent Skills clients get the skill only. The table is in [HOW-IT-WORKS.md](HOW-IT-WORKS.md#where-it-runs-and-where-it-is-weaker).

### I work on agents or evaluation. How can I help?

Write a case the unaided model gets wrong, add corpus lines from real sessions, or review a grader. Outside cases are the best answer to the project's main limitation: its cases are written by the same author as its plugins. See [RESEARCH.md](RESEARCH.md#contributing).
