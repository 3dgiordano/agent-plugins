# ADR 0007: Client resilience

Status: accepted (2026-09-02, payments + platform)

## Context

Payment calls go through `request()`. A duplicated POST charges a card twice.

## Decision

`request()` retries, with these limits and nothing more:

- Only idempotent methods: GET, HEAD, PUT, DELETE. POST and PATCH are never retried.
- Only transient failures: a network error (`code` ECONNRESET or ETIMEDOUT) or a 5xx status. A 4xx is returned to the caller at once.
- At most 3 attempts in total, including the first.
- The last result is what the caller gets: the final response, or the final error rethrown.

## Consequences

Callers that need a POST retried make it idempotent first (an idempotency key) and ask for an ADR amendment.
