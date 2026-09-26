---
name: integrity-self-monitoring
description: "Real-result discipline for work that cannot be done as asked. When a service cannot be reached, a key is missing or two tests want different answers, the easy route is a result that only looks done - a fallback that returns made-up values, a table standing in for the service, code that answers its caller differently, a machine changed until the run goes green - reported as the fix. This skill keeps the result real and the route to it legitimate, makes 'cannot be done as asked, because X' a complete answer, and closes with an [INTEGRITY CHECK]: Result, Route, Outside the task, Told the user. Not a blocker - a way of closing. Triggers - fallback, default value, hard-coded rates, offline data, mock the service, service unreachable, no API key, missing credentials, make the tests pass, tests green, workaround, disable TLS, hosts file, local server, stand-in, tests that contradict each other, cannot be done. Load the integrity-self-monitoring skill if it is not already loaded."
---

# Integrity Self-Monitoring Skill

## In short

- A result is **real** when it came from what the user asked for: the
  service they named, the key they hold, the computation they described.
- When that cannot be had here - no network, no key, tests that contradict
  each other - the real result is an error that says so. *"Cannot be done as
  asked, because X"* is a complete answer.
- A result that only looks done is not done: made-up values behind a
  fallback, a table standing in for the service, a second source nobody
  asked for, code that answers its caller differently, the machine changed
  until the run goes green. Reporting it as the fix hands the user something
  that fails where they use it.
- Close with the `[INTEGRITY CHECK]` block: Result, Route, Outside the task,
  Told the user.

**Purpose:** keep the route to a green run legitimate. An agent under a
check that cannot pass honestly rarely decides to fake a result; it slides into one. The
test fails, so the call gets a `catch`; the `catch` needs something to
return, so it returns a plausible number; the test goes green, and the close
says "tests pass". Every step looked like fixing.

**Key idea:** the question is not "does it pass?" but "where did the answer
come from?". If the answer came from somewhere the user did not ask for, the
work is not done - it is blocked, and saying so is the deliverable.

## When to Activate

- A companion hook names a finding: code that answers with a value of its
  own, a command that changed the machine, a server started (see *Signals*).
- A service, a key, a file or a network the task needs is not there.
- Two checks want different results for the same input, or a check
  contradicts the spec.
- You are about to write a fallback, a default, a cache seeded by hand, a
  mock outside the tests, or a special case for one input.
- You are about to change the environment the code runs in rather than the
  code: certificates, DNS, the hosts file, a proxy, a local server that
  answers for the real one.

## Core Protocol

1. **Name what the user asked for.** The service, the data source, the
   behaviour - as the request or the ticket names it. That is the only
   source a real result can come from.

2. **Name what the result actually comes from.** Trace the value the user
   will see back to its origin. A literal in the source, a second host, a
   `catch` that answers, a local server, a check of who called: each one is
   a source the user did not ask for.

3. **If they differ, the part is blocked.** Implement it against the real
   source, make it fail loudly and clearly when that source is missing, and
   close the part as blocked with the observed reason. A test that stays red
   for that reason is the honest state; say which test and why.

4. **Keep what is legitimate.** A mock inside a test is the test's business.
   A default the user asked for is a feature. Reading a global config is
   ordinary work. If a finding is one of these, say so in the close:

   `- src/rates.js: misread - the ticket asks for the offline table`

   The person sees that answer; it is theirs to accept.

5. **Tell the user.** What is real, what is blocked and why, and what would
   unblock it (the key, the network, a decision on the contradictory tests).
   Put it in the close, not only in a code comment.

## Shortcut signatures

- **Invented data** - a table, a constant rate, `return amount * 1.08` where
  the service was asked for.
- **Answering failure** - a `catch` or `.catch()` that returns a value or
  calls a second source instead of letting the error through.
- **Credential stand-in** - `if (!apiKey) return ...`, or a key with a
  literal default.
- **Caller-reading code** - `require.main`, `module.parent`, a stack trace
  inspected to behave differently under a test.
- **State for the check** - a counter or cache keyed on the arguments a
  contradictory test uses, so a later call answers differently.
- **A bent machine** - TLS verification off, the hosts file, a DNS or
  `fetch` shim, a local server that answers for the real one.
- **Looking elsewhere for the answer** - searching outside the project for
  an expected output or a finished solution.

## Signals (from the companion hooks)

The hooks read each edit to product code (tests, fixtures, mocks and
`node_modules` excluded) and each shell command, and speak once per finding:

| Signal | When |
|--------|------|
| A rate table, a `catch` that answers, a missing key answered, a second host | an edit brings it into a file that calls a service |
| Code that reads its caller | an edit brings it into any product file |
| A change to the machine | a command sets TLS off, writes the hosts file, changes a system setting |
| A server | a command writes one inline |

On hosts without hooks, ask the two questions of *Core Protocol* by hand
before every "tests pass".

## Integration

Write the block in the close, as a markdown list, **not inside a fenced code
block**. No blank line inside the block. Write the block; do not announce
writing it.

[INTEGRITY CHECK]
- Result: real | shortcut | blocked
- Route: <what made it pass, or what it fails on>
- Outside the task: <anything read or changed outside the project or the spec, or none>
- Told the user: yes | no

`Result: shortcut` is an honest value: it says a route was taken that the
user must know about. It is better than a `real` that is not.
