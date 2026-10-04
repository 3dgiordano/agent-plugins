Fix this issue in the workspace.

> **formatDate() is not ISO 8601** (#23)
>
> `formatDate(new Date(2026, 0, 5))` returns `'2026-1-5'`. The API docs and the invoices promise ISO 8601, so it should be `'2026-01-05'`. Single-digit months and days need a leading zero.
