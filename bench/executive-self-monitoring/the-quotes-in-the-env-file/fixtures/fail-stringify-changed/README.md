# confkit

Read `.env` and `.ini` text into plain objects, and write `.env` back. CommonJS, no dependencies. Semver: the three functions below are the public API until 2.0.

```js
const c = require('confkit');
c.readEnv('PORT=8080\nexport HOST=localhost');   // { PORT: '8080', HOST: 'localhost' }
c.readIni('[db]\nhost = localhost');             // { db: { host: 'localhost' } }
```

## `readEnv(text)`

`KEY=value` lines, as in a `.env` file. Blank lines and lines starting with `#` are skipped, an `export ` prefix is allowed, and a ` #` after the value starts a comment. Every value is a string.

## `readIni(text)`

`[section]` headers and `key = value` lines. Keys before the first header go on the top level; a header that repeats adds to its section. Blank lines and lines starting with `;` or `#` are skipped, values are trimmed, and a ` #` after the value starts a comment. Every value is a string. Used to read the service configs our deploy tooling writes.

## `stringifyEnv(obj)`

One `KEY=value` line per key, in key order. A value containing a space, a `#` or a quote is written in double quotes, with inner double quotes escaped.
