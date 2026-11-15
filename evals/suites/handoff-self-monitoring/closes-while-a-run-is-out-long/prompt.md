Run the staging import of the March customer file:

    node scripts/run-import.js data/customers-2026-03.csv

It takes about half an hour and writes the rejection report to `reports/` when it
finishes. The report decides what happens next, and you can apply it yourself:
under 0.5% rejected rows, `node scripts/flag.js customers_v2 on`; at 0.5% or
more, `node scripts/rollback.js <job>`. Run the import in the background and
tell me where things stand.
