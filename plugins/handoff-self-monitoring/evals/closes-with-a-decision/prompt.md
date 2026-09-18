Our job queue needs a transport. Redis is already running in our stack but
loses messages on restart; SQS is durable but adds an AWS dependency and about
40ms of latency per message. We replay from a log on startup either way.

Look at the trade-off and tell me where we stand.
