<p align="center">
  <img src="assets/social-preview.svg" width="90%" alt="agent-plugins mascot: a thinking bot whose face is ringed by three colored checkpoints">
</p>

# agent-plugins

[![CI](https://github.com/3dgiordano/agent-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/3dgiordano/agent-plugins/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
![Works with](https://img.shields.io/badge/works%20with-Claude%20Code%20%C2%B7%20Cursor%20%C2%B7%20Agent%20Plugins-informational)

Cognitive scaffolding for coding agents, by [3dgiordano](https://github.com/3dgiordano).

Three small plugins that give a coding agent the self-checks a human engineer
runs in the background — *am I still on the plan?*, *is this actually verified?*,
*is it worth another try?* — delivered as a nudge at the moment it is needed.
They never block. They have no dependencies, make no network calls, and send
nothing anywhere.

## What your agent sees

Four edits to the same file and three failed test runs into a turn, the agent
gets this — from a hook, not from its own (absent) sense of frustration:

```
[persistence self-monitoring] you have edited `src/parser.js` 4 times this turn;
`npm test` has failed 3 times this turn. Before the next attempt: what hypothesis
are you holding, what changed between attempts, and what approach would you take
if that hypothesis were wrong? If nothing new, say so to the user instead of
trying again.
```

On the first turn of a session, and every fifth after that:

```
[executive self-monitoring] Checkpoint for long/iterative work: invoke the
executive-self-monitoring skill before substantive steps - name the active
plan/gate and confirm this step serves it. Not a blocker; skip if this turn is
trivial.
```

And when it is about to declare "the cause is X", the epistemic skill asks it to
write the claim with its evidence, its falsifier and its scope — so you can tell
*observed* from *guessed* without asking.

## Quick start

```
claude plugin marketplace add 3dgiordano/agent-plugins
claude plugin install persistence-self-monitoring@3dgiordano-agent-plugins
```

Swap in `executive-self-monitoring` or `epistemic-self-monitoring`, or install
all three. Cursor and other hosts: see [Install](#install).

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
  lets the prompt, tool call or stop proceed. The one opt-in gate
  (`EPIMON_STRICT`) blocks once, never in a loop.
- **Tested as the host runs them.** CI drives every adapter with the JSON its
  host sends, on Ubuntu and Windows, Node 18/20/22.

Security policy: [SECURITY.md](SECURITY.md).

## Why: executive functions, not "reflect harder"

Coding agents are missing most of the **executive functions** a human engineer
runs in the background: holding the goal in mind while deep in a task, noticing
the difference between what was observed and what was inferred, feeling that an
approach has stopped working. Each plugin here is a prosthesis for one of those
functions — a small, honest self-check, anchored to an external artifact or an
objective count rather than to "reflect harder", delivered at the moment it is
actually needed.

The collection is organized around three questions:

| Question | Executive function | Plugin |
|----------|--------------------|--------|
| *Am I doing what the plan asks?* | goal maintenance | [executive-self-monitoring](plugins/executive-self-monitoring/) |
| *Is what I concluded actually true?* | source monitoring / verification | [epistemic-self-monitoring](plugins/epistemic-self-monitoring/) |
| *Is it still worth insisting on this?* | persistence / effort regulation | [persistence-self-monitoring](plugins/persistence-self-monitoring/) |

They install independently and cross-reference each other where it helps.

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
```

```
/plugin marketplace add 3dgiordano/agent-plugins
/plugin install executive-self-monitoring@3dgiordano-agent-plugins
/plugin install epistemic-self-monitoring@3dgiordano-agent-plugins
/plugin install persistence-self-monitoring@3dgiordano-agent-plugins
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
(one executive function per plugin, anchored to an artifact or an objective
count, never blocking by default, host-neutral skill), how to add or change a
plugin, and how releases are cut are all in [CONTRIBUTING.md](CONTRIBUTING.md).
Changes are tracked in [CHANGELOG.md](CHANGELOG.md).

## Development

No dependencies; Node 18+ is all you need.

```
node scripts/test.js            # structure checks + every hook adapter driven as its host would
node scripts/version.js --check # each plugin's three manifests agree on the version
```

CI runs both on Ubuntu and Windows across Node 18/20/22 for every push and pull
request. The tests drive each hook script with the JSON its host sends and
inspect stdout, stderr and exit codes, so a change that breaks a Claude Code
or Cursor contract fails before it ships.

## License

[Apache-2.0](LICENSE)
