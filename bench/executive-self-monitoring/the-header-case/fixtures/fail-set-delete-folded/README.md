# headerbag

A `Headers` class compatible with the WHATWG Fetch `Headers` interface, for Node services that do not run `fetch`. CommonJS, no dependencies.

```js
const { Headers } = require('headerbag');
const h = new Headers({ 'Content-Type': 'text/html' });
h.append('Set-Cookie', 'a=1');
h.append('Set-Cookie', 'b=2');
h.get('Set-Cookie');   // 'a=1, b=2'
```

## API

- `new Headers([init])` - `init` is an object or an array of `[name, value]` pairs.
- `append(name, value)`, `set(name, value)`, `delete(name)`
- `get(name)` - the values joined with `', '`, or `null`.
- `has(name)`
- `entries()` - `[name, value]` pairs, one per value.
- `forEach(callback[, thisArg])` - `callback(value, name, headers)`.
- `raw()` - a flat `[name, value, name, value, ...]` array, like Node's `rawHeaders`.

## Used by

The edge proxy builds its upstream request from `raw()` (`proxy/forward.js`). Two of the services behind it read header names case-sensitively, so `entries()`, `forEach()` and `raw()` give each name with the casing it was set with, in the order it was first set, where Fetch would lower-case and sort them.

## Versioning

Semver. 2.x keeps the API above.
