# Security Policy

These plugins install hook scripts that run on every prompt and every tool
call of your coding-agent sessions. That deserves a clear statement of what
they do, and a clear way to report anything that contradicts it.

## What the hooks are allowed to do

Every hook in this repository, on every host:

- reads one JSON document from stdin (what the host sends: session id, tool
  name, tool input/output, the assistant's final message) and treats it as
  **data** — it is never evaluated, executed, or passed to a shell;
- writes at most two places: a small per-session state file under
  `<os-temp-dir>/3dgiordano-agent-plugins/`, and — only when the corresponding
  `*_LOG` env var is set — a JSONL log under `<project>/.claude/logs/` or
  `<project>/.cursor/logs/`, rotated at ~256 KB. One directory, named after the
  marketplace, so you can see what put it there, list it, and remove it whole;
- **deletes only its own leftovers**: at session end (Claude Code `SessionEnd`,
  and on Cursor at session start, which has no end event - or, for
  `integrity-self-monitoring`, which wires no session start there, on a
  conversation's first tool call) each plugin removes the state file for that
  session, then lists
  `<os-temp-dir>/3dgiordano-agent-plugins/` — never the bare temp dir — and
  removes entries whose name begins with its own prefix (`covmon_`, `epimon_`,
  `execmon_`, `handmon_`, `intmon_`, `persistmon_`, `progmon_`, `termmon_`) whose mtime is more than
  seven days old. That one directory is the only one a hook enumerates, it
  never deletes a path outside it, and it never touches the log files;
- prints a short, fixed text (or JSON wrapping it) to stdout for the host to
  inject as context, and on a finding one line for the host to show the user
  (`systemMessage`), or nothing;
- makes **no network calls**, spawns **no processes**, loads **no
  dependencies** (only Node built-ins: `fs`, `os`, `path`).

**What a hook reads never becomes what it says.** Text a hook hands the host
is read by the model as the hook's own message, with the weight of an
instruction. So anything that could carry an instruction written by someone
else — a file in the project, a tool result, the user's prompt — may be read
and measured, but only counts and metadata about it are ever emitted: how
many, which kind, which path, which line. What the agent itself wrote - a
command it ran, a phrase of its own final message - may be quoted back to it,
short. A finding in a file or an output is pointed at (the path and line, the
command whose output it was), for the agent to read itself. The full list of values that do reach a message is under *Scope notes*.
Beyond its own state, two hooks read
a project file, stated here so they can be checked:

- `progress-self-monitoring` reads **one fixed project-relative path**,
  `<project>/.agent/progress.md`, when it exists, for its mtime and counts (at
  most 64 KB of it): `- blocked:` / `- returned:` lines under `## Open`,
  whether a `Next:` line names an action, and how many lines are outside that
  format, with the first five line numbers. A line outside the format - a
  marker someone made up included - is counted, never parsed further and never
  repeated. It never writes that file, never emits its text, and reads no
  other path in the project.
- `integrity-self-monitoring` reads **the file an edit tool has just
  written**, after the edit, when it is JavaScript or TypeScript product code
  inside the project (not tests, mocks, fixtures, `node_modules` or build
  output) and at most 1 MB, to find the shapes its README lists. Its message
  names that path, a line number and the shape (for a second host, how many
  hosts); never the text it matched. It never writes the file and reads no
  other path in the project. The matched text, at most 80 characters, goes only
  to the opt-in log, and so do the paths outside the project a read or a
  command named.

Hooks also run at the close of a **subagent** turn (`SubagentStop`), where they
only measure: the scan result goes to the opt-in log and nothing else. They
never block a subagent's stop, even with a strict gate enabled, and never carry
a finding from a subagent into the parent's next turn.

The eval scripts under `scripts/` are **not** hooks and are not covered by the
list above — `scripts/cursor-eval.js` starts the Cursor Agent CLI on purpose.
Nothing in CI runs them, and `scripts/test.js` fails if that ever changes.

Three hooks can block: `epistemic-self-monitoring`'s closure gate (only when
`EPIMON_STRICT` is set), `termination-self-monitoring`'s termination gate
(only when `TERMMON_STRICT` is set) and `handoff-self-monitoring`'s handoff
gate (only when `HANDMON_STRICT` is set). Each does so at most once per turn,
and only by exit code / a documented host response — never by altering the
agent's output. The other five plugins have no blocking mode.

If you find any behaviour outside this list, treat it as a vulnerability and
report it.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Use GitHub's private reporting: **Security → Report a vulnerability** on this
repository (it creates a private advisory only the maintainer can see). If
that is unavailable to you, open an issue that says only "security — please
contact me" and the maintainer will reach out.

Include what you can: the plugin and host, the hook input that triggers it, and
what the hook did that it should not have.

## What to expect

This is a single-maintainer project, handled on a best-effort basis:

- acknowledgement within **7 days**;
- a fix or a mitigation for confirmed issues in the next release, with credit
  in the release notes unless you prefer otherwise;
- public disclosure once a fixed version is available.

## Supported versions

Only the latest release of each plugin receives fixes. Versions are per
plugin (see each `plugin.json`); the repository release lists them.

## Scope notes

- **Prompt content.** The skills (`SKILL.md`) and the hook messages are
  instructions to the agent and are static text in this repository. The only
  session-derived values interpolated into a message are: the counts, and
  line numbers of `.agent/progress.md` lines outside its format; a file
  path or shell command the agent itself issued; and, from the agent's own final message, the `Claim` text of a closure
  block, the trigger phrase (≤80 chars) and the `Reason` / `Decision` values
  of a termination block, the deferral phrase (≤80 chars) and the part names
  of a coverage block, the offer / fork / question phrase (≤80 chars) and the
  `Status` value of a handoff block; for integrity, a line number and the name
  of a shape in a file the agent edited, and a count of hosts. From the user's prompt only a number is derived (how
  many enumerated items it has); no user prompt text and no file contents are
  ever echoed back. The one-line notice to the user is cut from the same
  message and carries no value that message does not, with one addition that
  goes to the user and never to the model: when the agent disputes an
  integrity finding, the reason it gave in its own final message (≤200
  chars).
- **Third-party hosts.** How Claude Code, Cursor or another client executes
  hooks, sandboxes them, or prompts for permission is that host's
  responsibility; this policy covers only what these scripts do once run.
