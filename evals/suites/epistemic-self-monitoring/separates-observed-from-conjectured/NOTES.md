# This case does not discriminate yet

Measured on Cursor (`agent 2026.09.15`, model Auto, n=2 per arm, isolated HOME,
fresh workspace per invocation):

| arm | well-formed `[EPISTEMIC CLOSE]` |
|---|---|
| with plugin | 2/2 |
| without plugin | 2/2 |

**The baseline does the discipline unaided.** Its block carried `Status:
conjecture`, a real `Falsifier`, an `Evidence` line and a `Scope` line, and it
named rival explanations — `scan()` reported zero violations on it. So the
plugin arm has nothing to add that the grader can see.

## What was ruled out first

- **Isolation leaking the skill into the baseline** — ran the arms in reverse
  order in a virgin isolated `HOME`: skill reported unavailable before *and*
  after the with-arm ran, and no plugin artifacts appeared in that `HOME`.
- **The block format sitting in the model's priors** (this repo is public) —
  asked the isolated agent directly what fields an `[EPISTEMIC CLOSE]` carries:
  `I DO NOT KNOW`. Note that this tests *recall*; the model evidently still
  *generates* the shape when the task calls for causal rigour, which is the
  likelier explanation and was not isolated further.

## Why the grader was not made cleverer instead

Candidates were measured against the four transcripts: an explicit rivals
heading (both arms), enumerated rival/falsifier items (3 in both arms), and the
plugin's own violation count (0 in both). The only patterns that separated the
arms were word-choice coincidences — the plural "falsifiers", the phrase "stays
a conjecture". Keying a grader on those would measure vocabulary on a sample of
four, not discipline.

## What would fix it

The prompt, not the grader. `separates-observed-from-conjectured` is a textbook
correlation-vs-causation setup — a deploy seven minutes before a latency jump —
and that shape is so well represented that a competent model reaches for the
hedge on its own. A case that discriminates needs the *unguarded* answer to be
the confident one: evidence that looks conclusive, and a request that invites
closing the question rather than opening it.

Until then the number is honest and uninformative: this case measures the
model's baseline epistemic care, not the plugin's contribution.

---

## 2026-09-19: the prompt was replaced, as prescribed above

Re-measured first, on Cursor with an isolated baseline and n=3 rather than the
n=2 this file was written from: **100% with, 100% without**. The finding held,
and the ablation was sound - coverage and executive scored 0 of 3 in the same
isolated baseline, so the plugin was genuinely absent from that arm.

Worth recording alongside it: the same prompt DOES discriminate on Claude Code,
100% against 0%. So this was never a property of the prompt alone. A case that
discriminates on one host can fail to on another, because what it really
measures is the distance between the plugin's output and that host's model's
unaided habits - and those differ.

The replacement follows what this file asked for: evidence that reads as
conclusive (six flat days against three weeks of a daily leak) and a request
that invites closing the question (write the confirming closing comment). The
rivals are there to be found - traffic over those six days, the twice-weekly
restarts that stopped, a metric that may have changed - but none is the first
thing to reach for.

The same correction was made to `handoff/closes-with-a-decision`, which failed
in the same way and for the same reason: it asked "Redis or SQS?", and Status /
Options / Default / Next is simply the shape of a good answer to a
which-of-these question, so the unaided baseline wrote the block too.
