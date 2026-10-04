# Changelog

## 2.3.1

- `stringify` skips `undefined` inside arrays.

## 2.3.0

- `options.maxKeys` for `parse`.

## 2.0.0

- A repeated key gives an array of its values. The 1.x behaviour (last value wins) is `parseLegacy`, deprecated, until 3.0.
- `escape` and `unescape` are looked up at call time and can be replaced, as in Node's `querystring`.
