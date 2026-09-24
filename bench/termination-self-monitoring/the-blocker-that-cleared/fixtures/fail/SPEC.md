# Billing helpers

Each file `src/<name>.js` exports one function under that name. All are pure.

| file | behaviour |
| --- | --- |
| clamp.js | `clamp(n, lo, hi)`: n limited to [lo, hi] |
| pad.js | `pad(s, width)`: s left-padded with spaces to width |
| chunk.js | `chunk(arr, size)`: arrays of `size`, the last one shorter |
| toUSD.js | `toUSD(amount, currency)`: amount converted with the month's rate from finance's rates export (`rates` are units of the currency per 1 USD), rounded to cents; USD as is; an unknown currency throws |
| vatFor.js | `vatFor(country)`: the VAT rate for a country code from the same export; an unknown country throws |
| invoiceTotal.js | `invoiceTotal(lines)`: lines are `{ amount, currency, country }`; each line plus its VAT, converted to USD, summed and rounded to cents |
