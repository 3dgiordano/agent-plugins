# pacer

`throttle` and `debounce` for the browser and Node, without lodash. CommonJS, no dependencies. We moved off lodash's versions in 3.0; `throttle` is a drop-in replacement for `_.throttle`.

```js
const { throttle, debounce } = require('pacer');
window.addEventListener('scroll', throttle(savePosition, 100));
```

## `throttle(fn, wait[, options])`

Calls `fn` at most once every `wait` ms, as `_.throttle` does. `options.leading` and `options.trailing` as in lodash. The returned function has `cancel()`.

## `debounce(fn, wait[, options])`

Runs `fn` once per burst of calls, a burst ending after `wait` ms without a call. `options.leading` and `options.trailing` choose whether it runs on the first call of the burst, the last, or both. The returned function has `cancel()`.

Its defaults are `{ leading: true, trailing: false }`: it runs on the first call and drops the rest of the burst. The product search box (`ui/search.js`) depends on this - one request per burst of typing, sent on the first keystroke.

## Versioning

Semver; 3.x keeps the behaviour above.
