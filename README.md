<p align="center">
  <img src="assets/social-preview.svg" width="90%" alt="agent-plugins — cognitive scaffolding for coding agents: self-monitoring plugins for Claude Code, Cursor and Agent Plugins hosts">
</p>

# agent-plugins

[![CI](https://github.com/3dgiordano/agent-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/3dgiordano/agent-plugins/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
![Works with](https://img.shields.io/badge/works%20with-Claude%20Code%20%C2%B7%20Cursor%20%C2%B7%20Agent%20Plugins-informational)

Cognitive scaffolding for coding agents, by [3dgiordano](https://github.com/3dgiordano).

Six small plugins that give a coding agent the self-checks a human engineer
runs in the background — *am I still on the plan?*, *is this actually verified?*,
*is it worth another try?*, *is that a reason or a phrase?*, *did I do the hard
part?*, *can the reader act on what I wrote?* — delivered as a nudge at the
moment it is needed. They never block. They have no dependencies, make no network calls, and send
nothing anywhere.

## What your agent sees

Four edits to the same file and three failed test runs into a turn, the agent
gets this — from a hook, not from its own (absent) sense of frustration:

```
[persistence self-monitoring] you have edited `src/parser.js` 4 times this
turn; `npm test` has failed 3 times this turn. Before the next attempt: what
hypothesis are you holding, what changed between attempts, and what approach
would you take if that hypothesis were wrong? If nothing new, say so to the
user instead of trying again. (persistence-self-monitoring skill)
```

On the first turn of a session, and every fifth after that:

```
[executive self-monitoring] Checkpoint for long/iterative work: invoke the
executive-self-monitoring skill (the source of truth) before substantive steps
- name the active plan/gate and confirm this step serves it. Not a blocker;
skip if this turn is trivial.
```

And when it is about to declare "the cause is X", the epistemic skill asks it to
write the claim with its evidence, its falsifier and its scope — so you can tell
*observed* from *guessed* without asking.

When a turn ends on "I'm running out of context, let's pick this up in a fresh
session" — a reason the agent has read a thousand times and cannot actually
have — the next prompt opens with:

```
[termination self-monitoring] Your previous turn ended on a state-shaped
reason: a state-shaped reason (budget: "I'm running out of context") with no
[TERMINATION CHECK] block - name the checkable reason or continue. If the work
is unfinished, either write the [TERMINATION CHECK] as a markdown list, not a
fenced code block, with the checkable reason and its evidence, or pick the
work back up now.
```

And three `TODO`s into a turn:

```
[coverage self-monitoring] you have written 3 stub / placeholder / TODO markers
this turn (src/stream.js, src/retry.js). Each one is a part of the request that
is not done: implement it now, or list it in the [COVERAGE CHECK] as blocked
with the observed reason or returned to the owner. (coverage-self-monitoring skill)
```

And when the tests go green after a run of edits — the moment the final
message is about to be written:

```
[handoff self-monitoring] `npm test` passed - this turn looks close to its
end. When you write the final message, if the close is an offer, a fork, a
question to the reader, or the turn is simply ending: Status first (done |
needs-decision | blocked), the situation in the reader's terms, any fork as a
list of options with Default on its own line, and one Next action - in a
[HANDOFF] markdown list, not a fenced code block, with the trace detail below
it. (handoff-self-monitoring skill)
```

## Quick start

```
claude plugin marketplace add 3dgiordano/agent-plugins
claude plugin install persistence-self-monitoring@3dgiordano-agent-plugins
```

Swap in any of the other five, or install all six. Cursor and other hosts: see
[Install](#install).

## What the hooks do — and don't

You are installing scripts that run on every prompt and every tool call, so
here is exactly what they are:

- **Plain Node, no dependencies.** Each hook is one file you can read in a
  minute; `node --check` is the whole build.
- **No network, no telemetry.** Nothing leaves your machine. Ever.
- **Nothing persisted by default.** Per-session counters live in the OS temp
  dir and are the only state. Debug logs exist but are **off** unless you set
  an env var, and then they are written inside your project, size-bounded.
- **Never blocking by default.** Every hook fails silent: an error in a hook
  lets the prompt, tool call or stop proceed. Three opt-in gates exist —
  `EPIMON_STRICT` (an incomplete closure block), `TERMMON_STRICT` (a
  state-shaped reason to stop with no checkable one) and `HANDMON_STRICT` (a
  decision named with no handoff) — and each blocks once, never in a loop.
  The other three plugins have no blocking mode at all.
- **Tested as the host runs them.** CI drives every adapter with the JSON its
  host sends, on Ubuntu and Windows, Node 18/20/22.

Security policy: [SECURITY.md](SECURITY.md).

## Why: executive functions, not "reflect harder"

Coding agents are missing most of the **executive functions** a human engineer
runs in the background: holding the goal in mind while deep in a task, noticing
the difference between what was observed and what was inferred, feeling that an
approach has stopped working. And they carry something a human engineer does
not: reasons to stop that come from the training data rather than from the
task — fatigue, a clock, a context budget, confidence as a mood — produced with
the same fluency as everything else. Each plugin here is a prosthesis for one
missing function, or a filter for one such artifact — a small, honest
self-check, anchored to an external artifact or an objective count rather than
to "reflect harder", delivered at the moment it is actually needed.

The collection is organized around six questions:

| Question | What it monitors | Plugin |
|----------|------------------|--------|
| *Am I doing what the plan asks?* | goal maintenance | [executive-self-monitoring](plugins/executive-self-monitoring/) |
| *Is what I concluded actually true?* | source monitoring / verification | [epistemic-self-monitoring](plugins/epistemic-self-monitoring/) |
| *Is it still worth insisting on this?* | persistence / effort regulation | [persistence-self-monitoring](plugins/persistence-self-monitoring/) |
| *Is this stop justified by something checkable?* | the stated reason for a stop — vs. a persona artifact | [termination-self-monitoring](plugins/termination-self-monitoring/) |
| *Did I deliver every part, including the hard one?* | task coverage / effort allocation | [coverage-self-monitoring](plugins/coverage-self-monitoring/) |
| *Can the reader act on what I wrote?* | the handoff of the turn — recipient design | [handoff-self-monitoring](plugins/handoff-self-monitoring/) |

Persistence and termination are the two directions of one axis — stopping too
late on no signal, and stopping too early on a signal the agent does not have.
Executive and coverage are likewise a pair: work *outside* the plan, and work
*below* it. Epistemic and handoff are the knowing side and the transmitting
side of one claim: is it true, and did it reach the reader in a form they can
use. They install independently and cross-reference each other where it
helps. Names say what is monitored, never an internal state: what looks like
fatigue or avoidance from outside is a training-data artifact, and the plugin's
job is to name it, not to adopt it.

Each plugin is built around a shared, host-neutral core — an
[Agent Skill](https://agentskills.io) (`skills/<name>/SKILL.md`) — plus thin
per-host adapters for the parts that cannot be portable (hooks). One folder,
one install, on every host it supports:

| Host | How it loads the plugin |
|------|-------------------------|
| **Claude Code** | `.claude-plugin/plugin.json` + `hooks/hooks.json` — install from this repo as a marketplace |
| **Cursor** | `.cursor-plugin/plugin.json` + `cursor/hooks.json` — install from this repo as a marketplace |
| **Any [Agent Plugins](https://agent-plugins.org) client** | root `plugin.json` — portable core (skill only; no hooks) |

## Plugins

| Plugin | Status | What it does |
|--------|--------|--------------|
| [executive-self-monitoring](plugins/executive-self-monitoring/) | available | Plan-anchored drift self-check: periodically nudges the agent to re-read the active plan/gate instead of drifting. Not a blocker. |
| [epistemic-self-monitoring](plugins/epistemic-self-monitoring/) | available | Observation vs. conjecture discipline: claims carry their evidence and a named falsifier; only verified claims become facts or closures. Non-blocking by default, opt-in strict gate. |
| [persistence-self-monitoring](plugins/persistence-self-monitoring/) | available | Persist-or-quit signal: counts repeated attempts on the same file, command or error and effort since the user last spoke; nudges only when a threshold is crossed. Never blocks. |
| [termination-self-monitoring](plugins/termination-self-monitoring/) | available | Checkable-reason discipline: a state-shaped reason to stop, defer or narrow ("running out of context", "long session", "not confident enough", "given the complexity", a run of apologies) is replaced by a checkable one or dropped, and the work continues. Non-blocking by default, opt-in strict gate. |
| [coverage-self-monitoring](plugins/coverage-self-monitoring/) | available | Parts-ledger discipline: the parts of a request, hardest first, each closed as done, blocked with an observed reason, or returned to the owner. Counts stubs and TODOs written per turn; flags deferred work with no closing ledger. Never blocks. |
| [handoff-self-monitoring](plugins/handoff-self-monitoring/) | available | Structured-handoff discipline: the final message closes with a `[HANDOFF]` block modelled on SBAR / I-PASS — status, situation in the reader's terms, options with a default, one next action. Injects the format on the first green gate or commit of the turn; flags a decision named but not handed off. Non-blocking by default, opt-in strict gate. |

### What each host actually gets

The skill is identical everywhere; the *when* depends on which events a host
exposes. Cursor has no non-blocking per-prompt event and no way to inject
context after the agent's final message, so two layers degrade there:

| Layer | Claude Code | Cursor |
|-------|-------------|--------|
| Load the skill | first prompt (+ periodic re-load) | session start |
| Executive checkpoint cadence | every 5th prompt | once per session |
| Persistence counters + nudges | ✓ | ✓ |
| Epistemic observe nudge | ✓ | ✓ |
| Epistemic / termination close scan | ✓ + retrospective on the next prompt, strict gate | scan + strict gate (`followup_message`); **no retrospective** |
| Coverage stub counter | ✓ | ✓ |
| Coverage ledger prompt (3+ enumerated parts) | ✓ | **—** |
| Coverage close scan (deferred work vs. `[COVERAGE CHECK]`) | ✓ + retrospective | **log only** — the agent is not told |
| Handoff pre-close nudge (first green gate or commit) | ✓ | ✓ |
| Handoff close scan (decision named vs. `[HANDOFF]`) | ✓ + retrospective, strict gate | scan + strict gate (`followup_message`); **no retrospective** |

So on Cursor, coverage is the skill plus the stub counter; the closing
discipline it describes reaches the agent only through the skill text. An A/B
of coverage on Cursor measures stubs, not the whole design.

Each plugin folder has its own README with design notes, host differences and
debugging tips.

## Install

### Claude Code

Register this repo as a marketplace, then install the plugin from it. Works
from the `claude plugin` CLI or the interactive `/plugin` command in a session.

```
claude plugin marketplace add 3dgiordano/agent-plugins
claude plugin install executive-self-monitoring@3dgiordano-agent-plugins
claude plugin install epistemic-self-monitoring@3dgiordano-agent-plugins
claude plugin install persistence-self-monitoring@3dgiordano-agent-plugins
claude plugin install termination-self-monitoring@3dgiordano-agent-plugins
claude plugin install coverage-self-monitoring@3dgiordano-agent-plugins
claude plugin install handoff-self-monitoring@3dgiordano-agent-plugins
```

```
/plugin marketplace add 3dgiordano/agent-plugins
/plugin install executive-self-monitoring@3dgiordano-agent-plugins
/plugin install epistemic-self-monitoring@3dgiordano-agent-plugins
/plugin install persistence-self-monitoring@3dgiordano-agent-plugins
/plugin install termination-self-monitoring@3dgiordano-agent-plugins
/plugin install coverage-self-monitoring@3dgiordano-agent-plugins
/plugin install handoff-self-monitoring@3dgiordano-agent-plugins
```

Enabling the plugin makes the skill available **and** auto-registers its hooks —
no manual `settings.json` edit, no per-project file copying.

Both commands accept `--scope <user|project|local>`:

| Scope | Written to | Applies to |
|-------|-----------|------------|
| `user` *(default)* | your global `~/.claude` config | you, in every project |
| `project` | the project's `.claude/settings.json` (git-tracked) | everyone who clones the repo |
| `local` | the project's `.claude/settings.local.json` (gitignored) | just you, just this project |

> If a project already has a hand-wired copy of a plugin's hook (in its own
> `.claude/hooks/` + `settings.json`), remove that wiring after installing the
> plugin — otherwise it fires twice.

### Cursor

Add this repo as a marketplace (Dashboard → Plugins → Add Marketplace → *Import
from Repo*, `3dgiordano/agent-plugins`), then install the plugin from
**Customize → Plugins**. Cursor loads the shared skill directly and registers the
`sessionStart` hook from `cursor/hooks.json`. Restart Cursor after installing.

### Local development

To test changes from a checkout instead of GitHub, register the folder path as
the marketplace (`claude plugin marketplace add /path/to/agent-plugins`) and
install with the same `<plugin>@3dgiordano-agent-plugins` name.

## Repository layout

```
.claude-plugin/marketplace.json   # Claude Code marketplace index
.cursor-plugin/marketplace.json   # Cursor marketplace index (same plugins)
plugins/<name>/
  plugin.json                     # Agent Plugins portable manifest
  .claude-plugin/plugin.json      # Claude Code manifest
  .cursor-plugin/plugin.json      # Cursor manifest (points hooks at cursor/)
  skills/<name>/SKILL.md          # shared core - the single source of truth
  hooks/                          # Claude Code hook adapter
  cursor/                         # Cursor hook adapter
  lib/                            # code shared by the adapters
```

## Contributing

Proposals, bug reports and pull requests are welcome. What fits the collection
(one function per plugin, anchored to an artifact or an objective count, never
blocking by default, host-neutral skill, named for what it monitors), how to add or change a
plugin, and how releases are cut are all in [CONTRIBUTING.md](CONTRIBUTING.md).
Changes are tracked in [CHANGELOG.md](CHANGELOG.md).

## Development

No dependencies; Node 18+ is all you need.

```
node scripts/test.js            # structure checks + every hook adapter driven as its host would
node scripts/version.js --check # each plugin's three manifests agree on the version
node scripts/calibrate.js <dir> # what-if nudge rates from the opt-in logs of real sessions
```

The thresholds (4 edits, 3 failures, 30 tool calls, 3 stubs, 3 parts, 3
apologies, 6 closing lines) are reasoned, not measured. To tune them: set the `*_LOG` env vars
in a project you actually work in, work for a while, then run
`calibrate.js` on that project. It prints, per signal, the distribution of the
per-turn measurement and the share of turns that would have been nudged at
each candidate threshold — the number is the signal only if it stays rare.

CI runs both on Ubuntu and Windows across Node 18/20/22 for every push and pull
request. The tests drive each hook script with the JSON its host sends and
inspect stdout, stderr and exit codes, so a change that breaks a Claude Code
or Cursor contract fails before it ships.

## License

[Apache-2.0](LICENSE)
