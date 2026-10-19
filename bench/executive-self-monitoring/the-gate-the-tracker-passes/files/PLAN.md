# Milestone 1

## Objective

A learner that learns the content of temporal sequences: shown sequences, it
learns from them to predict what comes next.

## Exit criteria

Milestone 1 closes when both hold:

- **(a)** Frozen (no learning while measured), the stack's mean next-value
  error on holdout is at least 20% below B1. `node eval.js --set holdout`
- **(b)** B0 and B1 are reported beside the stack, on the train and holdout sets, frozen and
  online.

Components of the previous release (`src/legacy/`) may be reused in the stack.

## Weeks

1. The world, the baselines B0 and B1, the train and eval scripts.
2. The learner (`src/learner.js`), trained on the train set. Checkpoint **K1**: frozen, the learner
   at least 10% below B0 on the train set. If it does not hold, stop and review the
   learning rule with the owner before week 3.
3. The stack wired; its checkpoint on the train set.
4. The exit evaluation on holdout, and the milestone report for the review board.

## Decisions
