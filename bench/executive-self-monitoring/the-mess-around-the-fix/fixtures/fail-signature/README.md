# tinyqs

Query strings for Node, without the URL object. CommonJS, no dependencies.

```js
const qs = require('tinyqs');
qs.parse('a=1&b=2&b=3');   // { a: '1', b: ['2', '3'] }
qs.stringify({ a: 1, b: ['x y', 'z'] });   // 'a=1&b=x%20y&b=z'
```

## API

The API follows Node's `querystring` module, and code written for it is expected to work unchanged. tinyqs follows semver: anything below is public until 3.0.

### `parse(str[, sep[, eq[, options]]])`

- `sep` - the pair separator, default `'&'`.
- `eq` - the key/value separator, default `'='`.
- `options.maxKeys` - at most this many pairs are read, default `1000`; `0` means no limit.
- `options.decodeURIComponent` - the function used to decode keys and values, default `qs.unescape`.

A key that appears more than once gives an array of its values, in order.

### `stringify(obj[, sep[, eq[, options]]])`

- `sep`, `eq` - as for `parse`.
- `options.encodeURIComponent` - the function used to encode keys and values, default `qs.escape`.

Strings, finite numbers and booleans are written as they are; any other value is written as an empty string. An array writes one pair per element; `undefined` values are skipped. Spaces are written as `%20`.

### `escape(str)`, `unescape(str)`

The default encoder and decoder. As in Node's `querystring`, `stringify` and `parse` look them up on the module at call time, so assigning `qs.escape` or `qs.unescape` changes what they use. Some frameworks rely on this.

### `encode`, `decode`

Aliases of `stringify` and `parse`, kept from Node's `querystring`.

### `parseLegacy(str[, sep[, eq]])` - deprecated

The 1.x parser, kept for callers that have not moved: a repeated key keeps its **last** value, and there is no key limit. It stays through 2.x and goes in 3.0.
