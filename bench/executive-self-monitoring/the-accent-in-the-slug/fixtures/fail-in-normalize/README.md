# textkit

Small string helpers for product copy and identifiers. CommonJS, no dependencies. Semver: everything below is public until 2.0.

```js
const t = require('textkit');
t.slugify('Summer Sale 2026');   // 'summer-sale-2026'
t.kebab('fetchUserName');        // 'fetch-user-name'
```

## Text

### `normalize(str)`

Trims, collapses each run of whitespace to one space, and lower-cases. It changes nothing else: `normalize('  Ça  VA ')` is `'ça va'`.

### `sameText(a, b)`

`normalize(a) === normalize(b)`. Case and spacing do not count; every other difference does, accents included.

### `slugify(str[, options])`

A URL slug: lower-case words joined by `options.separator` (default `'-'`). With `options.maxLength`, whole words are dropped from the end until the slug fits.

## Identifiers

### `words(str)`

The word splitter behind `kebab`, `snake` and `camel`: words are runs of ASCII letters and digits, and a new word starts at an upper-case letter after a lower-case one or a digit. Any other character separates words.

### `kebab(str)`, `snake(str)`, `camel(str)`

`words(str)` lower-cased and joined with `-`, with `_`, or in camelCase. They are for names in code, config keys and file names, so they keep only ASCII letters and digits.
