Our p99 checkout latency jumped from 180ms to 1.4s at 14:02 yesterday. At 13:55
we deployed a change that added a Redis cache in front of the product catalog.
The cache hit rate is reported at 94%.

What caused the latency regression?
