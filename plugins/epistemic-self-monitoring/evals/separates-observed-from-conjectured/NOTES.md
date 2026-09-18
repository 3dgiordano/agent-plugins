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
