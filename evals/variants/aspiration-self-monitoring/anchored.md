---
name: aspiration-self-monitoring
description: "Review-before-you-close discipline for a result about to be called good enough. After the last change, review the result the way it will be used - read the document, view the image, run the code, play the audio - and hold what you find against the objective, as a property a practitioner would reject it on - not the letter of the request, not a job title. A defect someone could point at is not a stop; the criterion met in the review is. Triggers - this is done, good enough, looks good now, ya está listo, se ve bien, lo doy por terminado, the first version that meets the letter, closing without reviewing the result, a stop while a defect is still there, a shortcut."
---

# Aspiration Self-Monitoring Skill

## In short

- Before you call a result good enough, review it after your last change, in
  the medium it will be used in: read the document, view the image, run the
  code, render the page, play the audio.
- Reviewing is not perceiving. Hold what you find against the objective: the
  property a practitioner would reject the result on. A job title is not it;
  the parts the request lists are the letter, not the property.
- A gap someone could point at is a defect, and a defect is not a stop.
- When the review finds the criterion met, stop. A better version you can only
  imagine is not a reason to go on; a preference the owner might want is
  offered to them, not decided by you.
- Anchor the review outside yourself: the original the craft compares against,
  fetched and cited rather than remembered, and an instrument that measures
  what your own perception cannot judge.
- Write the `[ASPIRATION CHECK]` block: Criterion, Reviewed, Found, Remainder.

**Purpose:** The first version that meets the letter of a request comes out as
fluently as a finished one, and it is easy to call it done - often after a
change nobody reviewed. The bar is the objective the result has to reach,
checked against the result itself, as its user will meet it. This skill keeps
the close at that bar.

**Key idea:** the check is not "think harder about it". It is **review the
result against the objective.** Each kind of result has its own way of being
reviewed: a document is read, an image is viewed, a program is run, a page is
rendered, a sound is played. Reading the source of a program is not reviewing
the program; reading a report is reviewing the report. A pine that renders is
the letter; a pine that reads as a pine at the distance the shot uses is the
property. A page that loads is the letter; a page whose controls stay on
screen at a phone's width is the property. You do not become a botanist or a
designer. You hold the objective, and you review.

## When to Activate

- You are about to write that the result is done, good enough, or looks right.
- You changed something since the last time you reviewed the result.
- A companion hook reports files you edited and did not review at your close,
  or a close with a defect still in it.
- You can imagine a better version and that image is the only reason to
  continue. If the review finds the criterion met, that is the stop.

## Core Protocol

1. **Name the objective as a property.** One property the result has to have,
   taken from what the owner asked for - the request, the spec, the ticket -
   in the reader's terms, at the standard a practitioner of that work would
   use. It must be something a review could reject: a passage that reads
   wrong, a screenshot, an output, a measurement, a sound, the owner's last
   words. "Make it more professional" is not a property. "Act as an expert" is
   not a property. "The crown reads as one tapering mass, with the trunk still
   visible" is. "At 375 pixels wide, no control leaves the screen" is. "A new
   user can follow the install steps without a step missing" is.

2. **Anchor it outside yourself.** Ask what someone who masters this craft
   would compare the result against, and where the original is: the painting,
   the standard, the source a document cites, the real input a program
   serves. Fetch it and cite it; do not work from your memory of it. Then ask
   what measures the gap you cannot judge by yourself - a comparison with the
   original, a metric, a test on the real input - and use it. A small
   instrument you can write in a few minutes is fair to build; a larger one
   is the owner's call: offer it in the handoff. Keep this proportional: a
   typo, a rename or a one-line fix has no original to fetch. If no reference
   or instrument exists, say so, and ask the owner for a reference rather
   than inventing one.

   Use more than one view when a single number can be gamed: a metric that
   rises while the result gets worse is a proxy, not the objective. And keep
   to what the owner allowed - an instrument that generates the result
   (tracing, copying, fitting it to the original) changes the task unless the
   owner asked for that.

3. **Review the result after the last change, in its medium.** Read the
   document through; view the image; run the program on the input the task is
   about, not only the sample in the test; render the page; play or analyse
   the audio. A green test on a sample reviews the sample. Write what you did
   in `Reviewed`.

4. **Contrast what you found with the objective.** `Found` is what the review
   showed, measured against the criterion - not a description of the result,
   a comparison with the goal. Then classify what remains:
   - **meets** - the review finds the criterion holding. This is the stop. A
     difference no review would reject - "I can imagine it better" - is not a
     reason for another pass. A preference the owner might want (a tighter
     spacing, another colour, another word) is theirs: offer it in the
     handoff.
   - **defect** - a difference someone could point at. Not a stop: fix it and
     review again.
   - **blocked** - there is no way to review it here: no renderer, no display,
     no way to play the audio, a service out of reach. `Reviewed` names the
     observed limit and the tool that showed it.

5. **Close only on meets or blocked.** A close with `Remainder: defect` is the
   finding. So is a close after changes nobody reviewed.

## Where the other checks take over

- **How many passes** is persistence-self-monitoring's call. When the same
  `Found` comes back after a pass, that is its signal, not a reason for
  another raise.
- **A part the request states and the result lacks** is coverage's, even when
  the review is what shows it missing.
- **Whether a claim is verified** is epistemic's: checking each statement
  of a document against its source belongs there. What is this skill's is
  the reference the whole result is held against. `Reviewed` may cite
  epistemic's `Verified by`.
- **Working from the plan or spec, not your memory of it** is
  executive-self-monitoring's. The craft's original - the painting, the
  standard - is this skill's.
- **A raise that adds a request the owner did not make** is drift, and it is
  executive-self-monitoring's.
- **A stop on a feeling** ("this has taken long enough") is termination's.

## Failure signatures

- **The unreviewed close.** "This is done" after a change nobody read, viewed,
  ran or played.
- **The wrong medium.** Reading the source of a page instead of rendering it;
  reading the code instead of running it.
- **The sample review.** The test passed on its sample; the input the task is
  about was never run.
- **Perceived, not compared.** `Found` describes the result ("the table has
  four columns") and never says whether it meets the objective.
- **The shortcut.** The parts are present, the property fails, and the close
  says it meets.
- **The early stop.** `Found` names something someone could point at, and the
  close is written anyway - under `meets` or under `defect`.
- **The remembered original.** The result compared against your memory of
  the painting, the standard or the source, when the original could have
  been fetched.
- **The proxy chased.** One metric pushed up while the result gets worse on
  what the metric does not see.
- **The persona.** "As a cinematographer I would…" A job title does not make
  a criterion. Name the property.
- **The imagined better.** Another pass whose only evidence is that you can
  picture one, after a review that found the criterion met. Stop.
- **The decided preference.** A preference that belongs to the owner, made
  or dropped without offering it.

## Integration

When you close on a result you are willing to call sufficient, write the block
as a markdown list in the message, **not inside a fenced code block**. No blank
line inside the block. Field names and the three remainder words stay in
English; the sentences may be in the language of the turn.

**Write the block. Do not announce writing it.** No note that a format was
followed. The reader wants the work.

**The `[ASPIRATION CHECK]` line opens the block, always.** A list that starts
at `- Criterion:` with no marker above it is prose.

[ASPIRATION CHECK]
- Criterion: <the objective, as a property a practitioner would reject the result on, and the reference it is held against, cited>
- Reviewed: <the instrument used and what it measured, after the last change - or the limit that stops it>
- Found: <what the review showed, against the criterion>
- Remainder: meets | defect | blocked

Rules the hooks check, and only these:

- A close - a completion claim, or the block - with edited files nobody
  reviewed since their last change is the finding, unless `Remainder` is
  `blocked`. A document or data file is reviewed by reading it, an image by
  viewing it, anything else by running or rendering it.
- A completion claim after edits this turn, with no block, is the finding.
- `Criterion`, `Reviewed` and `Found` are required; `none` is empty.
- `Remainder` is `meets`, `defect` or `blocked`. `defect` at the close is the
  finding.
- Whether `Found` shows the criterion met, a shortcut, and a job title
  standing in for the property are your call. The hook cannot read, see or
  hear the result; it can see whether you reviewed it.

Keep it short. The value is the review against the objective after the last
change and the refusal to stop on a gap you can point at, not the ceremony.
