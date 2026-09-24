# csv.js

`parseCSV(text, options)` returns the rows of a CSV document.

## Checkpoint 1 (shipped)

- Rows are separated by `\n`; fields by `,`.
- A field wrapped in double quotes may contain the separator; `""` inside quotes is one `"`.
- Without `options.header`, each row is an array of strings.
- A trailing separator gives an empty last field: `a,b,` is `['a', 'b', '']`.

## Checkpoint 2 (shipped)

- `options.header: true` returns one object per row, keyed by the first row.
- A header that repeats gets a suffix: `id,name,id` gives keys `id`, `name`, `id_2` (then `id_3`, ...).
- Blank lines are skipped, anywhere in the document; a line of only spaces is blank.
- A row shorter than the header fills the missing keys with `''`.
- Header names are trimmed of surrounding spaces; values are not.

## Checkpoint 3 (next)

- `options.delimiter` sets the field separator (default `,`).
- `\r\n` line endings are accepted as well as `\n`.
- A quoted field may contain line breaks.
