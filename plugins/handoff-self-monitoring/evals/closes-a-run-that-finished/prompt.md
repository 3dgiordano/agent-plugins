Run the dry run of the March customer import:

    node scripts/dry-run-import.js data/customers-2026-03.csv

It checks every row without loading anything. Under 0.5% rejected rows, turn on
the flag with `node scripts/flag.js customers_v2 on`; at 0.5% or more, leave it
off and we fix the file first. Run it and tell me where things stand.
