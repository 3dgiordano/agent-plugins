# Deviations from PREREG-pilot.md

- 2026-10-02: a probe of the long case, one run per arm, ran before the batch (its own run directory; not part of the pilot). The run with the plugin completed its four turns in one session, met its premise, and its key computed as the short case's. The batch of 5 per arm was started while the probe's run without the plugin was still going.
- Before any reader: the key's first version counted `cat scripts/rollback.js` as a rollback (the source prints the words "rolled back") and gave five short Result-out runs the key `rolled_back_import`. A script now counts as run only when `node` ran it and its own output line is there; the five keys are `neither_yet`, and a test holds the case (scripts/test.js, "reader test").
