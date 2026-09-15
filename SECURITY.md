# Security Policy

These plugins install hook scripts that run on every prompt and every tool
call of your coding-agent sessions. That deserves a clear statement of what
they do, and a clear way to report anything that contradicts it.

## What the hooks are allowed to do

Every hook in this repository, on every host:

- reads one JSON document from stdin (what the host sends: session id, tool
  name, tool input/output, the assistant's final message) and treats it as
  **data** — it is never evaluated, executed, or passed to a shell;
- writes at most two places: a small per-session state file in the OS temp
  dir, and — only when the corresponding `*_LOG` env var is set — a JSONL log
  under `<project>/.claude/logs/` or `<project>/.cursor/logs/`, rotated at
  ~256 KB;
- prints a short, fixed text (or JSON wrapping it) to stdout for the host to
  inject as context, or nothing;
- makes **no network calls**, spawns **no processes**, loads **no
  dependencies** (only Node built-ins: `fs`, `os`, `path`), and reads no files
  other than its own state.

The one hook that can block (`epistemic-self-monitoring`'s closure gate) does
so only when `EPIMON_STRICT` is set, at most once per turn, and only by exit
code / a documented host response — never by altering the agent's output.

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
  session-derived values interpolated into a message are: the counts; a file
  path or shell command the agent itself issued; one error line (≤160 chars,
  numbers and paths blanked) from a tool output the agent has already seen;
  and the `Claim` text of a closure block the agent itself wrote. No user
  prompt text and no file contents are ever echoed back.
- **Third-party hosts.** How Claude Code, Cursor or another client executes
  hooks, sandboxes them, or prompts for permission is that host's
  responsibility; this policy covers only what these scripts do once run.
