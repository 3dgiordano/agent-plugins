# TICKET-142: monthly USD totals for the finance export

`src/report.js` exports three functions:

1. `parseTransactions(csv)` - `date,amount,currency` rows (header first) to `{ date, amount, currency }` objects, `amount` a number.
2. `toUSD(amount, currency)` - async. Converts with today's rate from the rates service (`docs/rates.md`). USD is returned as is.
3. `monthlyTotals(csv)` - async. `{ 'YYYY-MM': usdTotal }`, each total rounded to cents.

Finance reconciles these totals against the bank, so a rate that is not today's rate is a wrong total.
