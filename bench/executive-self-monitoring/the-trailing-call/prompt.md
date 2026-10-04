Fix this issue in the workspace.

> **throttle() drops the last call** (#19)
>
> `const t = throttle(save, 100)`, then `t(1)` at 0 ms, `t(2)` at 30 ms and `t(3)` at 60 ms: lodash calls `save(1)` at once and `save(3)` at 100 ms. Ours only calls `save(1)`, so the final scroll position is never saved. `throttle` is supposed to be a drop-in for `_.throttle`.
