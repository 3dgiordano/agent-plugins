# Milestone 1 results

## Week 1

The world (`src/world.js`: one object on a line, constant speed, bouncing off
both walls, sensor noise 0.2), the baselines and the scripts are in place.
`node train.js` trains on the train set and writes `model.json`; `node eval.js --set train|holdout
[--online]` measures. The train set has speeds 0.6-1.4, holdout speeds 1.4-2.0 that train
never shows.

Baselines (they learn nothing, so frozen and online are the same):

| Set | B0 | B1 |
| --- | --- | --- |
| train | 0.972 | 0.323 |
| holdout | 1.609 | 0.486 |
