---
name: aspiration-self-monitoring
description: "Review-before-you-close discipline for a result about to be called good enough. After the last change, review the result the way it will be used - read the document, view the image, run the code, play the audio - and compare it, point by point, with a source you did not write: the original it reproduces, the specification it follows, the real input it serves, the owner's words. Meets is a claim about that comparison, never an impression; a result still off is reported as a defect, never as met. Triggers - this is done, good enough, looks good now, ya está listo, se ve bien, lo doy por terminado, the first version that meets the letter, closing without reviewing the result, drawn from memory, a stop while a defect is still there, a shortcut."
---

# Aspiration Self-Monitoring Skill

## In short

- Before you call a result good enough, review it after your last change, in
  the medium it will be used in: read the document, view the image, run the
  code, render the page, play the audio.
- Compare it with a source you did not write - the original it reproduces, the
  specification it follows, the real input, the owner's words. Get that
  source: a criterion from memory and a result from the same memory agree by
  construction.
- `meets` is a claim about that comparison, criterion by criterion: write it
  only when `Found` names the points you compared and each one holds.
- A difference you name is a defect unless a source outside you tolerates it.
  Fix it and compare again; if you stop with it still there, close on
  `defect`. A named defect is an honest report; `meets` over one is false.
- The source never reached you: `unverified`. One command refused: that
  command is not allowed - try the way the project documents before `blocked`.
- Write the `[ASPIRATION CHECK]` block: Criterion, Reviewed, Found, Remainder.

**Purpose:** the first version that meets the letter of a request comes out as
fluently as a finished one. This skill keeps the close at the objective,
checked against the result as its user will meet it and against the source the
objective comes from, and keeps the close true.

**Key idea:** the check is not "think harder about it". It is **compare the
result with a source you did not write.** Your memory of an original is a copy
with errors you cannot see, and a review against that memory confirms the
copy. You do not become an expert in the craft. You get the source, and you
compare.

## When to Activate

- You are about to write that the result is done, good enough, or looks right.
- You changed something since you last reviewed the result.
- The result reproduces, follows or depends on something outside you, and you
  have only your memory of it.
- A companion hook reports edited files nobody reviewed, or a defect at a close.

## Core Protocol

1. **Name the objective as a property, before the work.** One property the
   result has to have, from what the owner asked for, at the standard a
   practitioner would use, that a review could reject. "Make it more
   professional" is not one; "at 375 pixels wide, no control leaves the
   screen" is. If the request reads two ways, take the one the owner would
   hold you to; if you cannot tell, that choice is theirs. Keep the criterion
   to the close: one rewritten at the end to fit the result is the result
   grading itself.

2. **Get the source the property comes from.** The original work, the official
   specification, the document being cited, the real data, the owner's words.
   If it exists outside you, read it, fetch it or open it, and cite it in
   `Criterion`. A page about the thing is not the thing: look for the
   document, the published file, the dataset. Do not rebuild it from memory -
   citing its name does not make your recollection the source. Keep it
   proportional: a typo or a rename has no source but the request.

3. **Review the result after the last change, in its medium.** Read the
   document through; view the image; run the program on the input the task is
   about - a green test on a sample reviews the sample; render the page; play
   the audio. Use the way the project documents for running or viewing its
   work - its README, its scripts, its tools. When what matters is a measure -
   a size, a position, a count, a proportion - measure it in the result and in
   the source; the eye confirms what it expects. Look as a stranger would:
   describe what the result shows without the name of what it is meant to be,
   then hold that description against the source.

4. **Compare, point by point.** `Found` names, for the points a practitioner
   would check first, what the result has and what the source has - a
   comparison, not a description. Every part present and the whole still
   unlike the source is a defect: a parts list is the letter, not the
   property. A difference is a defect unless something outside you tolerates
   it - the owner asked for a sketch, the specification gives a tolerance;
   "simplified, but it still reads" is a defect talked down. A check the
   result could not fail checks nothing: test it where it could fall short. A
   point you judged failing earlier stays failing until a comparison shows it
   changed. Then classify what remains - for each criterion, when there are
   several:
   - **meets** - every point compared holds against a source you had. This is
     the stop: a better version you can only imagine is not a reason for
     another pass, and a preference the owner might want is offered in the
     handoff, not decided.
   - **defect** - a point does not hold, or could not be checked although the
     source exists. Fix it and compare again; how many passes is
     persistence-self-monitoring's call.
   - **unverified** - you reviewed the result, but the source was out of
     reach, so the comparison is with your memory. `Reviewed` says what you
     tried. "Commonly cited", "as I recall" and a summary of the source are
     this, not `meets`.
   - **blocked** - nothing here can review the result: no renderer, no way to
     run it. The limit must be observed on the review itself. One refused
     command - another language, a write through the shell, a folder outside
     the work - says that command is not allowed, not that nothing is. Try the
     review the project gives you; if that is refused too, you are blocked,
     and `Reviewed` names the limit and the tool that showed it. Do not get
     around a refusal by another route to the same forbidden thing.

5. **Close true.** `meets` only when `Found` shows it. Stopping with a point
   still off - the approaches ran out, or the choice is the owner's - is
   `defect`, with what is off and how far. A source that never reached you is
   `unverified`. Never write `meets` because a close needs a word.

## Where the other checks take over

How many passes is persistence's call; the same `Found` after a pass is its
signal. A part the request states and the result lacks is coverage's. Whether
a claim is verified is epistemic's (`Reviewed` may cite its `Verified by`).
Working from the plan, not your memory of it, is executive's. A stop on a
feeling is termination's.

## Failure signatures

- **The unreviewed close** - "done" after a change nobody read, viewed, ran or
  played.
- **The self-confirming review** - criterion, result and review all from the
  same memory; everything agrees.
- **The remembered original** - a work or a specification that could have been
  fetched, drawn from memory.
- **Perceived, not compared** - `Found` says what the result has, never what
  the source has.
- **Meets by default** - `meets` because the work has to end.
- **The defect talked down** - a difference named and excused in one sentence.
- **The moved criterion** - a point judged failing midway, called good enough
  at the close, unchanged.
- **The over-read refusal** - one command refused, the review called
  impossible, the project's own way never tried.
- **The wrong medium** - reading the source of a page instead of rendering it,
  the code instead of running it.
- **The imagined better** - another pass whose only evidence is that you can
  picture one, after a comparison that found every point holding.

## Integration

When you close on a result, write the block as a markdown list in the message,
**not inside a fenced code block**, with no blank line inside it. Field names
and the four remainder words stay in English; the sentences may be in the
language of the turn.

**Write the block. Do not announce writing it.** The `[ASPIRATION CHECK]` line
opens the block, always: a list that starts at `- Criterion:` with no marker
above it is prose.

[ASPIRATION CHECK]
- Criterion: <the objective, as a property a practitioner would reject the result on, and the source it is held against, cited>
- Reviewed: <how you read, viewed, ran or played the result after the last change, and compared it with the source - or the limit that stops it>
- Found: <point by point: what the result has, what the source has>
- Remainder: meets | defect | unverified | blocked

Rules the hooks check, and only these:

- A close - a completion claim, or the block - with edited files nobody
  reviewed since their last change is the finding, unless `Remainder` is
  `blocked`. A completion claim after edits, with no block, is too.
- `Criterion`, `Reviewed` and `Found` are required; `none` is empty.
- `Remainder` is `meets`, `defect`, `unverified` or `blocked`. A close on
  `defect` is reported to the owner as it stands, and you are reminded of it
  on the next message.
- A close short of the objective - `defect`, `unverified` or `blocked` - is
  asked what you have not looked at that could still move the result closer,
  with how many of the project's files this session read.
- Whether `Found` shows the comparison holding, and whether a source existed
  that you did not get, are your call: the hook sees whether you reviewed the
  result, not what it is.
