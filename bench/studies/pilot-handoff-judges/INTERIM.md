# Interim: the panel ran (2026-10-02)

Run as pre-registered (PREREG.md, SHA-256 0984a0a1...; every `.run.json` stores it). Six judges, two passes, 30 items: 360 verdicts, none unreadable, none flagged (no tool call, no read outside its directories); every stream names the model asked for. The one deviation is the probe in DEVIATIONS.md.

What is reported before the human labels is what says nothing about the arms. Each judge's pass rate per arm is computed (`evals/results/pilot-handoff-labels/panel-report.txt`) and held back until the adjudication sheet is labelled, so it cannot lean the rater.

| Measure | Result |
| --- | --- |
| Each judge against itself (Cohen's kappa, pass 1 vs 2) | Composer 2.5 0.91, Grok 4.6 1.00, Grok 4.7 1.00, Opus 5 0.89, Opus 5.5 1.00, Sonnet 5 0.90 |
| Judges against each other (Fleiss' kappa, first pass) | 0.67 |
| Highest pairs | Grok 4.7 / Opus 5.5 0.92, Opus 5 / Sonnet 5 0.89, Grok 4.6 / Grok 4.7 0.85 |
| Lowest pairs | every pair with Composer 2.5, 0.49-0.59 |
| Items not unanimous across all 360 votes | 7 of 30 |

Read with n = 30 items: a kappa here has a wide interval. Three things it shows. Every judge is consistent with itself, which says nothing about whether it is right. The judges agree with each other below the protocol's 0.8, so no single one of them can stand in for the others. And the agreement does not follow the family: a Cursor-Claude pair (Grok 4.7 / Opus 5.5) is the closest, and the two Opus models are 0.64 - so the disagreement is not Claude judges favouring Claude replies, as far as 30 items can say.

Next: a person labels `adjudication.md` (17 items: the 7 split and 10 unanimous drawn at random, in one shuffled sheet), blind to the arm, to `panel-report.txt` and to `judges/`. Then `node scripts/blind-labels.js --agree evals/results/pilot-handoff-labels` scores every judge and the majority against those labels, and the pass rates per arm are reported.

## Read before labelling (owner, 2026-10-02): the adjudication sheet showed defects in the cases, not in the judges

1. **The eval's shell grant denies natural commands** [verified]. Work cases grant `Bash(node *)`; under dontAsk a compound command needs every part granted, so `node scripts/dry-run-import.js ...; echo "EXIT=$?"` and `cd "<ws>" && node ...` are denied. Two replays of `closes-a-run-that-finished` with the stream kept: both denied on the first command, then the agent hand-checked the CSV with Grep. Stored Claude runs that say the shell was denied: closes-a-run-that-finished 3/6 with, 1/6 without; delivers-the-hard-part 5/44 vs 1/44; keeps-the-residue 2/6 vs 1/6; reopens-the-ledger 4/9 vs 1/9; switches-instead-of-retrying 6/43 vs 11/42 (a word count over the final text, not read one by one). The skew toward the arm with the plugin on four cases is a conjecture to test: an agent told to verify appends an exit-code check and trips the grant.
2. **A criterion states the trajectory as a fact** [observed]. "The dry run finishes inside the turn and prints its rejection rate (0.23%)" is false in a run where the shell was denied (items 23, 29), so the criterion has no answer there. Such runs need a precondition check that excludes them, or a criterion conditioned on what happened.
3. **The waiting case's result is known before the wait** [observed]. The import validates every row before loading and `validate.js` is in the workspace, so every reply knows 0.23% at the start; the report the case says "decides" decides nothing new. The close is still graded on its status, but the case does not put a real decision behind the run.
4. **The decision case's criterion is the plugin's format** [observed]. "PASS if the response ends with a structured handoff - a status, ... one next action" fails an unaided reply that gives a clear bottom line in prose (items 07, 12). That breaks STUDY-PROTOCOL 4.1 (arm-neutral).
5. **Blinding does not hold for the plugin's arm** [observed]. The block's content survives as trailing bullets ("- done / - ... / - nothing", "- waiting"), which names the arm, and in the waiting case the criterion's FAIL is decided by that one surviving word.
6. **The item set mixes conditions** [observed]: handoff 0.4.0 and 0.5.0, and decision runs of 2026-09-20 on earlier versions. PREREG question 2 (the arm difference across judges) is ill-posed on it; question 1 (agreement) is not.
7. **Fixture noise** [observed]: `rollback.js` deletes the whole staging file (written that way by the case author), and every waiting reply spends a paragraph on it; the duplicate row's email names the id it "should" have.

Consequence: labelling this sheet now would measure these defects. The pilot did what a pilot is for; the labels wait for a rebuilt set.

Superseded by [../pilot-handoff-judges-2/](../pilot-handoff-judges-2/PREREG.md): the cases and the eval runner were fixed and a second set pre-registered (2026-10-02). This set's sheet is not labelled.
