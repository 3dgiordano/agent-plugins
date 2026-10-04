# Interim: the second panel ran (2026-10-02)

Run as pre-registered (PREREG.md, SHA-256 606ddeb8...), with the deviations in DEVIATIONS.md. Six judges, two passes, 30 items: 360 verdicts after re-reading every pass with one parser; one excluded (Composer 2.5, pass 2, item 29: a tool call in ask mode), none unreadable.

## What it shows, without the arms

| Judge | fail verdicts, pass 1 / pass 2 (of 30) | against itself |
| --- | --- | --- |
| Opus 5 | 0 / 0 | 100% |
| Composer 2.5 | 0 / 1 | 97% |
| Sonnet 5 | 1 / 1 | 93% |
| Grok 4.7 | 3 / 2 | 97% |
| Opus 5.5 | 3 / 4 | 97% |
| Grok 4.6 | 4 / 2 | 93% |

The first set had 263 pass and 97 fail across the panel; this one has about 13 fails in 360. With the eval environment fixed and one plugin version, Opus 5.5's closes meet these rubrics almost always - that is a result about the cases: they no longer separate much on this model.

It is also why the pre-registered statistics do not answer here. With 0 to 4 fails in 30, Cohen's and Fleiss' kappa are degenerate (Composer agrees with itself 97% and scores 0.00; Composer and Opus 5 score 1.00 because neither fails anything; Fleiss is 0.40). What can be read:

- **Two judges never or almost never fail a reply** (Opus 5, Composer 2.5): on this set they carry no information about a bad close.
- **Three judges fail the same few replies across families**: Grok 4.7 and Opus 5.5 give identical first-pass verdicts (kappa 1.00), and Grok 4.6 is at 0.84 with each. Whether those few are the right ones is the question only a person's labels answer.
- **7 of 30 items are not unanimous** across all votes.

The decision rule cannot be applied: there are almost no fails to agree or disagree on. Labelling this sheet would validate only that judges recognise good closes, and the overall pass rate stated here would lean a rater; it is not labelled.

## Next (returned to the owner)

A validation set with real fails, near half, from configurations that produce them on the same fixtures (handoff 0.4.0 on the waiting case, agents on Cursor for the other two), and statistics that hold at any prevalence, pre-registered before the run: prevalence per class, positive and negative specific agreement, and Gwet's AC1 beside kappa.
