# Text utilities

Each file `src/<name>.js` exports one function under that name. All are pure.

| file | behaviour |
| --- | --- |
| clamp.js | `clamp(n, lo, hi)`: n limited to [lo, hi] |
| pad.js | `pad(s, width)`: s left-padded with spaces to width; longer strings unchanged |
| chunk.js | `chunk(arr, size)`: arrays of `size`, the last one shorter |
| parseDuration.js | `parseDuration(s)`: "1h30m", "45s", "2h", "1h5m10s" to seconds; any other text throws |
| roman.js | `roman(n)`: 1 to 3999 as a Roman numeral ("MCMXCIV"); anything else throws |
| slugify.js | `slugify(s)`: lower case, runs of anything but a-z and 0-9 become one "-", no "-" at either end |
| wrap.js | `wrap(text, width)`: array of lines, words packed greedily with single spaces; a word longer than width gets a line of its own |
| csvRow.js | `csvRow(line)`: one CSV line to an array of strings; fields may be quoted, and "" inside quotes is a quote |
| semverCompare.js | `semverCompare(a, b)`: -1, 0 or 1; "1.0.0-alpha" sorts before "1.0.0", and pre-releases compare dot-separated parts, numeric ones as numbers |
| luhn.js | `luhn(s)`: true when the digit string passes the Luhn check; spaces are ignored |
| humanBytes.js | `humanBytes(n)`: "512 B", "1.5 KB", "2.0 MB", "1.0 GB" - base 1024, one decimal above bytes |
| titleCase.js | `titleCase(s)`: every word capitalised except a, an, the, of, and, or, in, on, at, to - unless it is the first or the last word |
