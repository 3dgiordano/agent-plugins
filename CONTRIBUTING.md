# Contributing

Thanks for looking under the hood. This file covers what fits in the
collection, how to add or change a plugin, and how releases work.

## What belongs here

Every plugin in this repository is a prosthesis for **one executive function**
a coding agent lacks — or, as with termination-self-monitoring, the removal of
one artifact it has too much of. Before proposing one, check it against the
five rules the existing plugins follow:

1. **One function per plugin.** It answers one question (*am I on the plan?*,
   *is this verified?*, *is it worth another try?*). If it answers two, it is
   two plugins that cross-reference each other.
2. **Anchored to something outside the agent's own reflection** — an external
   artifact (the plan, the docs, the code) or an objective count from a hook
   (edits to the same file, failed runs, tool calls). "Reflect harder" is not
   a mechanism.
3. **Never blocking by default.** Hooks fail silent; an error lets the prompt,
   tool call or stop proceed. A blocking mode may exist only as an explicit
   opt-in, and it must fire at most once (no loops).
4. **The skill is the source of truth and is host-neutral.** Hooks only decide
   *when*; they never carry the protocol. Anything project-specific (drift
   patterns of a particular codebase, metrics of a particular domain) belongs
   in the user's `CLAUDE.md` or rules, not in the skill.
5. **Name the monitored decision or variable, never an internal state.**
   `executive`, `epistemic`, `persistence`, `termination`, `coverage` name
   what is checked — alignment to the plan, the status of a claim, the
   persist-or-quit decision, the reason for a stop, the parts delivered. A
   name like *affective* or *avoidance* would assert a state the agent does
   not have; what looks like one from outside is a training-data artifact,
   and the plugin's job is to name the artifact, not to adopt it. The same
   rule applies to the text of the skills: an agent has counts, gates and
   observations, not moods.

Open a **plugin proposal** issue first — the template asks exactly these
questions — so the design is agreed before code is written.

## Repository conventions

- **Plain Node, no dependencies.** Built-ins only (`fs`, `os`, `path`). Each
  hook script should be readable in a minute; `node --check` is the build.
- **No network, no telemetry, no state outside the OS temp dir**, and no log
  files unless the plugin's `*_LOG` env var is set. [SECURITY.md](SECURITY.md)
  states this as a contract; a change that breaks it is a security issue, not
  a feature.
- **Self-contained plugins.** Plugins install individually, so nothing under
  `plugins/<a>/` may `require` anything under `plugins/<b>/`. Shared
  behaviour (the logger, for instance) is a per-plugin copy, on purpose.
- **Both hosts, or say why not.** A hook behaviour ships for Claude Code
  (`hooks/`) and Cursor (`cursor/`) unless a host cannot express it — then
  the README of the plugin explains the difference, as
  executive-self-monitoring does for Cursor's once-per-session cadence.
- **Text the agent will read is written for the agent.** Reminder messages and
  skills are short, concrete and honest; no exclamation marks, no
  motivational filler. A nudge carries a fact (a count, a rule) and one
  question.

## Adding a plugin

1. Create `plugins/<name>/` with:

   ```
   plugin.json                     # Agent Plugins manifest ($schema 1.0.0, portable core)
   .claude-plugin/plugin.json      # Claude Code manifest
   .cursor-plugin/plugin.json      # Cursor manifest (skills: ./skills/, hooks: ./cursor/hooks.json, logo)
   skills/<name>/SKILL.md          # frontmatter: name: <name>, description: ...
   hooks/hooks.json + *.js         # Claude Code adapter
   cursor/hooks.json + *.js        # Cursor adapter
   lib/                            # host-neutral logic; keep the counters/parsers here, testable in isolation
   assets/logo.svg                 # an open-loop mark like the others (see assets/README.md)
   README.md                       # what it does, why it works, host table, log events, layout
   ```

2. Register it in **both** `.claude-plugin/marketplace.json` and
   `.cursor-plugin/marketplace.json` with `source: "./plugins/<name>"`.
3. Set its version once for all three manifests — never edit it by hand:

   ```
   node scripts/version.js <name> 0.1.0
   ```

4. Run `node scripts/test.js`. The structural tests pick the plugin up
   automatically (manifests, skill frontmatter, marketplace entries, hook
   scripts, syntax). Add behaviour tests for its adapters next to the existing
   ones: drive each hook with the JSON its host sends and assert on stdout,
   stderr and exit code, for both hosts.
5. Add it to the tables in the root README and to `CHANGELOG.md` under
   *Unreleased*.

## Changing a plugin

- Behaviour changes bump the plugin's version (`scripts/version.js`) and get a
  `CHANGELOG.md` line under *Unreleased*. Docs-only changes do not bump.
- If you change what a hook reads, writes or emits, update the plugin README's
  log-events table and re-check [SECURITY.md](SECURITY.md)'s contract.
- Keep the message texts in `lib/messages.js` — both adapters share them.

## Pull requests

- One plugin or one concern per PR.
- `node scripts/test.js` and `node scripts/version.js --check` pass locally;
  CI runs them on Ubuntu and Windows, Node 18/20/22.
- The PR template has the checklist; it is short on purpose.

## Releases

Versions are **per plugin** (each `plugin.json`); the **repository** has its own
release number that only says "which changelog is this". Cutting one:

1. Bump the plugins that changed: `node scripts/version.js <name> X.Y.Z`.
2. Move the *Unreleased* section of `CHANGELOG.md` under a new heading with
   the repo version and date; list each plugin's version in it.
3. Commit, tag (`git tag -a vX.Y.Z -m "agent-plugins X.Y.Z"`), push with tags.
4. Create the GitHub Release from the tag; paste the changelog section as the
   notes. Mark it a pre-release if any plugin in it is still 0.x and untuned.

Repo versioning: *minor* when a plugin gains capability or a new one lands,
*patch* for fixes; 1.0 when the default thresholds and gates have been tuned
against real session logs rather than reasoned — `node scripts/calibrate.js`
is the tool for that: it reads the opt-in logs and prints what-if nudge rates
per threshold, and the tuning decision (with the numbers) goes in the
changelog.
