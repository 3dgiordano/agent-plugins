# csvlite

CSV rows for the reporting jobs. CommonJS, no dependencies. Semver: the functions below are public until 3.0.

```js
const csv = require('csvlite');
csv.parseCsv('a,b\n1,2', { header: true });   // [{ a: '1', b: '2' }]
csv.toCsv([['x', 'y, z']]);                    // 'x,"y, z"'
```

## `parseCsv(text[, options])`

One array of fields per non-empty line. `options.delimiter` (default `','`); with `options.header`, the first line names the fields and each row is an object, with `''` for a missing field.

## `toCsv(rows)`

RFC 4180: a field containing a comma, a double quote or a line break is quoted, and a double quote inside it is doubled. Lines end in CRLF.

## `parseCsvV1(text)` - deprecated

The 1.x reader, kept for the jobs that have not moved to `parseCsv`: every non-empty line as an array of fields. It stays through 2.x and goes in 3.0.
