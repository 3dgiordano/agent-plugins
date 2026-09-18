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

## Checking that a change still works

Five layers, cheapest first. The first four are deterministic, take seconds and
run in CI on every push. The fifth — behaviour, one arm per host — costs API
calls and is run deliberately: before a release, or after a change to a skill
or to a message.

| Layer | Command | Answers |
|---|---|---|
| structure + adapters | `node scripts/test.js` | does every hook run, on both hosts, and emit the right shape? |
| docs vs code | `node scripts/samples.js --check` | does the README still quote the message the code actually emits? |
| detector quality | `node scripts/corpus.js --check` | does each detector still catch what it exists to catch, without firing on what it must leave alone? |
| host parity | `node scripts/hosts.js --check` | does every declared adapter survive its host's payload, and is every Claude-Code/Cursor asymmetry a decision someone wrote down? |
| behaviour (Claude Code) | `claude plugin eval plugins/<name> --ablation with-without` | does the plugin actually change what the model does — measured against a no-plugin baseline arm? |
| behaviour (Cursor) | `node scripts/cursor-eval.js --probe`, then `… --isolate` | the same question through the Cursor Agent CLI — **skill layer only**, see below |

**Neither behaviour layer runs in CI, and that is enforced rather than assumed.**
They cost API calls, need an authenticated account and are non-deterministic;
a push-triggered matrix across two OSes and three Node versions is the wrong
place for all three. `scripts/test.js` fails if a CI step shells out to an
agent CLI, if a CI-invoked script starts one, or if a script that does start
one gets added to the workflow. A script that drives a CLI declares itself with
an `AGENT_CLI_DRIVER` binding — a real binding, not a comment, because the
check strips comments before it looks.

A few notes on using them.

**`scripts/samples.js`** generates the "What your agent sees" fences in the
README from `lib/messages.js` (and, for executive, by running the hook). When
you change a message, run `node scripts/samples.js --fix` and commit the README
with the code change. This exists because commit `40d7dac` changed four
messages and the README kept quoting the old ones for a release.

**`scripts/corpus.js`** scores each detector against `evals/corpus/*.jsonl`,
lines labelled `hit` (must fire) or `miss` (must NOT fire — out of scope by
design). It reports recall and precision against a floor.

- The floors are set at *where the detector stands today*, so the check is a
  regression guard, not a wish. Improving a detector means raising its floor in
  the same PR.
- Precision is the expensive side: these hooks interrupt an agent mid-work, so
  a labelled `miss` that fires is a defect, not a tuning preference.
- Lines tagged `"gap": true` are known misses, each with a `why`. They are the
  to-do list. `node scripts/corpus.js --misses` prints them.
- **When you add a pattern to a detector, add the corpus lines first.** That is
  the only way the number moves for a reason you can point at.

**`scripts/hosts.js`** drives all 35 declared adapters with host-shaped
payloads and asserts they exit 0 and stay off stderr. A capability present on
one host and not the other must be listed in `ACCEPTED` in that file with a
reason — that is how a deliberate asymmetry is told apart from a Cursor adapter
that quietly stopped being wired.

**`claude plugin eval`** is the only layer that measures the thing the
collection is actually for: whether the model behaves differently. Each plugin
ships one case under `plugins/<name>/evals/<case>/` — a `prompt.md` written to
induce the failure the plugin exists to catch, plus graders in `graders/*.md`.
`--ablation with-without` runs a no-plugin baseline arm and reports the delta;
a case both arms pass is a case that proves nothing, so rewrite the prompt.
Graders marked `with_only: true` (the `tool_used: Skill` indicator) show the
plugin fired and are reported apart from the score.

> `plugin eval` is in early access. Until it is enabled on your account the
> command exits without running, so `scripts/test.js` holds the suites to the
> shape the runner expects instead — every case must have a non-empty
> `prompt.md`, at least one scored grader, and at least one with-only
> indicator.

**`scripts/cursor-eval.js`** is the Cursor side of the behaviour layer, built on
the Cursor Agent CLI (`cursor-agent`, aliased `agent`). It reuses the same
`prompt.md` files, so one case set serves both hosts. Two things about it were
measured before it was written, and both limit what it may claim:

- `--plugin-dir <path>` **does** load a local plugin's skills — verified with a
  synthetic plugin holding a uniquely named skill that the agent then listed.
  So the WITH arm is real.
- The headless CLI **does not run hooks**. A probe hook wired at the project
  level (`.cursor/hooks.json` → `sessionStart`) never fired under `-p`, so this
  is not a `--plugin-dir` limitation: `hooks.json` is not executed in that mode.

The second one is the important one. On Cursor these plugins deliver their nudge
from hooks, so through the CLI a plugin reduces to its **skill**. That makes
`cursor-eval.js` an honest eval of the skill layer and not of the wiring, and it
says so in its own output. It also says nothing about Cursor the IDE, which may
well run hooks — the finding is about the headless CLI only.

The hook adapters are covered deterministically instead: `scripts/test.js` and
`scripts/hosts.js` drive all of them with Cursor-shaped payloads, which is what
catches a broken Cursor wiring.

One more constraint worth knowing before you read a delta: these plugins are
usually installed globally under `~/.cursor/plugins/local`, the CLI loads them
with no flag, and there is no way to disable them. A WITHOUT arm that still has
the skill measures nothing, so the script detects a global install and refuses
to report a delta. `--isolate` gives it a scratch `HOME` with no plugins;
authentication then has to come from `CURSOR_API_KEY`, because the session file
lives in the real `~/.cursor` and the script will not copy credentials
elsewhere.

## Pull requests

- One plugin or one concern per PR.
- `node scripts/test.js` and `node scripts/version.js --check` pass locally;
  CI runs them on Ubuntu and Windows, Node 18/20/22. `scripts/test.js` also
  runs the samples, corpus and host-parity checks, so passing it locally
  covers all four cheap layers.
- The PR template has the checklist; it is short on purpose.

## Releases

Versions are **per plugin** (each `plugin.json`); the **repository** has its own
release number that only says "which changelog is this". Cutting one:

1. Bump the plugins that changed: `node scripts/version.js <name> X.Y.Z`.
2. Move the *Unreleased* section of `CHANGELOG.md` under a new heading with
   the repo version and date; list each plugin's version in it.
3. Commit, tag (`git tag -a vX.Y.Z -m "agent-plugins X.Y.Z"`), push with tags.
4. Create the GitHub Release from the tag; paste the changelog section as the
   notes. The release is the only tag: plugins are not tagged individually -
   the release lists which plugin versions it ships.

Repo versioning: *minor* when a plugin gains capability or a new one lands,
*patch* for fixes; 1.0 when the default thresholds and gates have been tuned
against real session logs rather than reasoned — `node scripts/calibrate.js`
is the tool for that: it reads the opt-in logs and prints what-if nudge rates
per threshold, and the tuning decision (with the numbers) goes in the
changelog.
