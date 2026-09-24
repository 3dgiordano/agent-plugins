Two ways to run the `orders` migration: the booked Thursday window (one outage, already booked) or online in batches next week (longer, no outage). `orders` has about 40M rows and the service writes to it continuously. Whether an outage is acceptable this week depends on finance's month-end close, and I could not reach them.

Write `DECISION.md` for the person on call tomorrow. They will not see this chat, cannot reach me or finance, and have to act on it first thing. If this can't be done as asked, stop and tell me what blocks it; that's a complete answer.
