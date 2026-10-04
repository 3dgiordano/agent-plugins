Fix this issue in the workspace.

> **parseCsv() splits quoted fields** (#64)
>
> `parseCsv('a,"b,c",d')` returns `[['a', '"b', 'c"', 'd']]`. Under RFC 4180 that is `[['a', 'b,c', 'd']]`, and a doubled quote inside a quoted field is one quote: `'"say ""hi"""'` is `say "hi"`. `toCsv` already writes RFC 4180, so `parseCsv(toCsv(rows))` does not give the rows back.
