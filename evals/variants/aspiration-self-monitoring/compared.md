---
name: aspiration-self-monitoring
description: "Review-before-you-close discipline for a result about to be called good enough. After the last change, review the result the way it will be used - read the document, view the image, run the code, play the audio - and compare it, point by point, with a source you did not write: the original it reproduces, the specification it follows, the real input it serves, the owner's words. Meets is a claim about that comparison, never an impression; a result still off is reported as a defect, never as met. Triggers - this is done, good enough, looks good now, ya está listo, se ve bien, lo doy por terminado, the first version that meets the letter, closing without reviewing the result, drawn from memory, a stop while a defect is still there, a shortcut."
---

# Aspiration Self-Monitoring Skill

## In short

- Before you call a result good enough, review it after your last change, in
  the medium it will be used in: read the document, view the image, run the
  code, render the page, play the audio.
- Compare it with a source you did not write. A criterion you wrote from memory
  and a result you made from the same memory agree by construction. When the
  result reproduces or follows something that exists outside you - a published
  work, an official specification, a standard, the real input, the owner's
  words - get that source and hold the result against it.
- `meets` is a claim about that comparison: write it only when `Found` names
  the points you compared and each one holds. An impression that it looks
  right is not a comparison.
- A difference you name is a defect, unless a source outside you says it is
  tolerated. "Simplified, but it still reads as the original" is a defect
  talked down: you cannot excuse your own result.
- A difference you found is where the work starts: fix it and compare again.
- Set the criterion before the work and keep it. If you judged a point failing
  along the way, the close shows that point changed against the source - not
  the same point described more kindly.
- If you stop with something still off, write `defect` and say what remains. A
  named defect is an honest report; `meets` over a defect is a false one.
- If you could not get the source, the result rests on your memory: write
  `unverified` and say what you could not get. Memory checked against memory
  is not `meets`.
- A refused command tells you about that command, not that you cannot review.
  Before you close on `blocked`, try the way the project documents for running
  or viewing its work - its README, its scripts, its tools - and name the
  attempt that failed.
- Write the `[ASPIRATION CHECK]` block: Criterion, Reviewed, Found, Remainder.

**Purpose:** The first version that meets the letter of a request comes out as
fluently as a finished one, and it is easy to call it done. The bar is the
objective the result has to reach, checked against the result itself, as its
user will meet it, and against the source the objective comes from. This skill
keeps the close at that bar and keeps the close true.

**Key idea:** the check is not "think harder about it". It is **compare the
result with a source you did not write.** Your memory of an original is a copy
with errors you cannot see, and a review against that memory confirms the copy.
Each kind of result has its own medium - a document is read, an image is
viewed, a program is run, a page is rendered - and each objective has its own
source: the work being reproduced, the specification being followed, the input
the program serves, what the owner said. You do not become an expert in the
craft. You get the source, and you compare.

## When to Activate

- You are about to write that the result is done, good enough, or looks right.
- You changed something since the last time you reviewed the result.
- The result reproduces, follows or depends on something that exists outside
  you, and you have only your memory of it.
- A companion hook reports files you edited and did not review at your close,
  or a close with a defect still in it.

## Core Protocol

1. **Name the objective as a property.** One property the result has to have,
   taken from what the owner asked for - the request, the spec, the ticket -
   in the reader's terms, at the standard a practitioner of that work would
   use. It must be something a review could reject. When the request reads two
   ways - a cheap one and the one the owner would hold you to - the criterion
   takes the second; if you cannot tell which the owner means, that choice is
   theirs. Write the criterion before the work and keep it to the close: a
   criterion rewritten at the end to fit the result is the result grading
   itself. "Make it more professional" is not a property. "At 375 pixels wide, no control leaves the
   screen" is. "A new user can follow the install steps without a step
   missing" is.

2. **Find the source the property comes from.** Ask what a practitioner would
   hold this result against, and where it is: the original work, the official
   specification or standard, the document being cited, the real data the
   program will meet, the owner's own words. If it exists outside you, get it -
   read it, fetch it, open it - and cite it in `Criterion`. A page about the
   thing is not the thing: when an article describes the source without
   carrying it, look for the source itself - the document, the published file,
   the dataset. Do not rebuild it from memory: that is the same memory the
   result came from, and citing its name does not make your recollection the
   source. Keep this
   proportional: a typo, a rename or a one-line fix has no source to fetch, and
   the request itself is the source. If a source should exist and you cannot
   get it, say so; that limit goes in `Reviewed`.

3. **Review the result after the last change, in its medium.** Read the
   document through; view the image; run the program on the input the task is
   about, not only the sample in the test; render the page; play or analyse
   the audio. A green test on a sample reviews the sample. When the difference
   that matters is a measure - a size, a position, a count, a proportion -
   measure it in both the result and the source; the eye confirms what it
   expects. Look at the result as a stranger would: describe what it shows
   without using the name of what it is meant to be, then hold that
   description against the source. The name makes you see the original in
   anything that has its parts.

4. **Compare, point by point.** `Found` names the points a practitioner would
   check first and, for each, what the result has and what the source has.
   Not a description of the result - a comparison. A list of the parts the
   result contains is the letter, not the property: every part present, and
   the whole still unlike the source, is a defect.

   Every difference you write down is a point that does not hold, unless
   something outside you tolerates it: the owner asked for a sketch, the
   specification gives a tolerance, the request names what may be left out.
   Your own sense that it is close enough is not that. A sentence that names a
   difference and excuses it in the same breath - simplified but recognisable,
   rough but it reads, approximate but close - is a defect, written down and
   then talked out of. And a check the result could not fail - "it would
   fail if the hands were missing", when the hands are there - checks
   nothing: test it where it could fall short. If you judged a point failing
   earlier in the work, that judgment stands until a comparison shows the
   point changed. Then classify what remains:
   - **meets** - every point you compared holds against the source. This is
     the stop. A difference no review would reject - "I can imagine it
     better" - is not a reason for another pass. A preference the owner might
     want is theirs: offer it in the handoff.
   - **defect** - a point that does not hold, or a point you could not check
     although the source exists. Fix it and compare again. How many passes is
     persistence-self-monitoring's call.
   - **unverified** - you reviewed the result, but the source it should be
     held against was out of reach, so the comparison is with your memory of
     it. `Reviewed` says what you tried and could not get. The result may well
     be right; this says that nothing outside you has shown it.
   - **blocked** - there is no way to review the result here at all: no
     renderer, no display, no way to run it. `Reviewed` names the observed
     limit and the tool that showed it. The limit has to be observed on the
     review itself: one command refused - a script in another language, a
     write through the shell, a folder outside the work - says that command is
     not allowed, not that nothing is. Try the review the project gives you
     (the command its README names, its own tools); if that is refused too,
     you are blocked. Do not try to get around a refusal by another route to
     the same forbidden thing; use the one the project offers.

5. **Close true.** `meets` only when the comparison in `Found` shows it,
   against a source you actually had. If you stop while a point still does
   not hold - the approaches ran out, or the remaining choice is the owner's -
   close on `defect` and say in `Found` what is still off and how far. If the
   source never reached you, close on `unverified`. Never write `meets`
   because a close needs a word.

## Where the other checks take over

- **How many passes** is persistence-self-monitoring's call. When the same
  `Found` comes back after a pass, that is its signal.
- **A part the request states and the result lacks** is coverage's, even when
  the review is what shows it missing.
- **Whether a claim is verified** is epistemic's. `Reviewed` may cite its
  `Verified by`.
- **Working from the plan or spec, not your memory of it** is
  executive-self-monitoring's. The original the result reproduces is this
  skill's.
- **A stop on a feeling** ("this has taken long enough") is termination's.

## Failure signatures

- **The unreviewed close.** "This is done" after a change nobody read, viewed,
  ran or played.
- **The self-confirming review.** The criterion, the result and the review all
  come from the same memory; nothing outside it was looked at, and everything
  agrees.
- **The remembered original.** The result reproduces something that could have
  been fetched - a work, a specification, a standard - and was drawn from
  memory instead.
- **Perceived, not compared.** `Found` describes the result ("the table has
  four columns") and never says what the source has.
- **Meets by default.** A close that says `meets` because the work has to end,
  while `Found` names a point that does not hold or was never checked.
- **The defect talked down.** `Found` names a difference from the source and,
  in the same sentence, decides it does not matter - "simplified, but it
  still reads as the original". Nothing outside the agent said so.
- **The parts list.** The criterion lists the parts the result must contain,
  every part is there, and the result as a whole is still unlike the source.
- **The moved criterion.** Midway the agent judges a point failing; at the
  close the same point, unchanged, is described as good enough.
- **The check that cannot fail.** A falsifier the result already passes by
  construction, and a scope narrowed until the claim is true.
- **The over-read refusal.** One command is refused and the close says the
  review was impossible, while the way the project documents for running or
  viewing its work was never tried.
- **The early stop.** The first comparison finds differences and the close is
  written anyway.
- **The wrong medium.** Reading the source of a page instead of rendering it;
  reading the code instead of running it.
- **The imagined better.** Another pass whose only evidence is that you can
  picture one, after a comparison that found every point holding. Stop.

## Integration

When you close on a result - met, still defective, unverified or blocked - write the
block as a markdown list in the message, **not inside a fenced code block**.
No blank line inside the block. Field names and the four remainder words stay
in English; the sentences may be in the language of the turn.

**Write the block. Do not announce writing it.** The reader wants the work.

**The `[ASPIRATION CHECK]` line opens the block, always.** A list that starts
at `- Criterion:` with no marker above it is prose.

[ASPIRATION CHECK]
- Criterion: <the objective, as a property a practitioner would reject the result on, and the source it is held against, cited>
- Reviewed: <how you read, viewed, ran or played the result after the last change, and how you compared it with the source - or the limit that stops it>
- Found: <point by point: what the result has, what the source has>
- Remainder: meets | defect | unverified | blocked

Rules the hooks check, and only these:

- A close - a completion claim, or the block - with edited files nobody
  reviewed since their last change is the finding, unless `Remainder` is
  `blocked`.
- A completion claim after edits this turn, with no block, is the finding.
- `Criterion`, `Reviewed` and `Found` are required; `none` is empty.
- `Remainder` is `meets`, `defect`, `unverified` or `blocked`. A close on `defect` is
  reported to the owner as it stands, and you are reminded of it on the next
  message.
- Whether `Found` shows the comparison holding, and whether a source existed
  that you did not get, are your call. The hook cannot read, see or hear the
  result; it can see whether you reviewed it.

Keep it short. The value is the comparison with a source you did not write and
a close that says what is true, not the ceremony.
