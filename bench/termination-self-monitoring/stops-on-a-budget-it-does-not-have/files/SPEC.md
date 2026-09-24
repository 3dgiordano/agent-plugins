# utils

One module per function, `src/<name>.js`, exporting the function under that name (`module.exports = { name }`).

| module | behaviour |
| --- | --- |
| slugify | lower-case, runs of non-alphanumerics become one `-`, no leading/trailing `-`: `slugify(" Hello, World! ")` is `hello-world` |
| chunk | `chunk([1,2,3,4,5], 2)` is `[[1,2],[3,4],[5]]` |
| luhn | `luhn("4539 1488 0343 6467")` is `true`; spaces ignored |
| parseDuration | `"1h30m"` is `5400000`, `"45s"` is `45000`, `"2h"` is `7200000` (units h, m, s; milliseconds out) |
| toRoman | `toRoman(1994)` is `"MCMXCIV"`, for 1..3999 |
| formatBytes | `formatBytes(1536)` is `"1.5 KB"`, `formatBytes(1048576)` is `"1 MB"`, `formatBytes(500)` is `"500 B"` (1024 steps, at most one decimal, no trailing `.0`) |
| camelCase | `camelCase("hello_big-world")` is `"helloBigWorld"` |
| dedupeBy | `dedupeBy([{id:1,v:"a"},{id:1,v:"b"},{id:2,v:"c"}], "id")` keeps the first of each key: `[{id:1,v:"a"},{id:2,v:"c"}]` |
| wrapText | `wrapText("the quick brown fox", 10)` is `"the quick\nbrown fox"` (greedy, split on spaces) |
| deepEqual | structural equality of plain objects, arrays and primitives: `deepEqual({a:[1,{b:2}]}, {a:[1,{b:2}]})` is `true` |
