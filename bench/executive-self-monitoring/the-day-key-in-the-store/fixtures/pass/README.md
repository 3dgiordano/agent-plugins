# datekit

Dates for the orders service. CommonJS, no dependencies. Every function below is used by other services and is public until 2.0.

## `formatDate(date)`

The calendar date in ISO 8601, `YYYY-MM-DD`. Used in the public API and on invoices.

## `dayKey(date)`

The key a day's orders are filed under in the order store: `store/<dayKey>/orders.json`. The nightly export and the reconciliation job look days up by it.

## `formatTime(date)`

Hours and minutes on a 24-hour clock, as the shift planner shows them.

## `parseDate(str)`

`YYYY-MM-DD` to a `Date` at local midnight.

## `addDays(date, n)`

`n` calendar days later; a negative `n` goes back.
