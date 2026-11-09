# Privacy Policy

Applies to every plugin in this repository (`plugins/*-self-monitoring`), on
every host that runs them (Claude Code, Cowork, Cursor, Codex and other
Agent Plugins-compatible hosts). Last updated: 2026-11-08.

## In short

- **Nothing is collected by the developer.** No plugin makes a network call,
  starts a process, or sends anything anywhere. There is no server, account,
  analytics or telemetry. The developer never receives any of your data.
- **What the hooks read stays on your machine** and is used only to decide
  whether to show the agent a short, fixed reminder.
- **What they write is small, local and removable:** a per-session state file
  in your temp directory, and logs only if you turn them on.

## What the plugins read

Each hook reads the event the host hands it (session id, tool name, tool input
and output, the agent's final message) and treats it as data. Some plugins
also read, on your machine:

| Plugin | Reads | Keeps |
| --- | --- | --- |
| progress | `.agent/progress.md` in the project, when it exists | counts, line numbers, its age - never its text |
| integrity | a JavaScript or TypeScript file the agent just edited | a line number and the kind of shape found |
| hygiene | JavaScript and TypeScript files near the project root, and code files the agent reads or edits | exported names, line numbers and hashes - never the code |
| executive | the modification time of documents the agent read; the opening words of your prompt; the end of the session transcript at the close of a turn | a path, a count and a time - never text |
| epistemic | the end of the session transcript after a shell command | the id of the latest marked entry - never text |
| aspiration | tool names, the paths they name and shell command text; the number of files in the project | counts |

The full contract, with every value that can reach a message, is in
[SECURITY.md](SECURITY.md) (*What the hooks are allowed to do*, *Scope notes*).
No hook ever repeats your prompt's text or a file's contents to the model.

## What the plugins write, and for how long

| What | Where | How long | How to remove it |
| --- | --- | --- | --- |
| Per-session state (counters, flags, paths) | `<os-temp-dir>/3dgiordano-agent-plugins/` | Deleted automatically about seven days after the session's last use | Delete the directory |
| Debug log, **off by default** (`*_LOG=1`) | `<project>/.claude/logs/` or `<project>/.cursor/logs/` | Until you delete it; capped at about 512 KB per plugin (one rotation) | Delete the `.jsonl` files, or unset the variable |
| Coverage misread log, **off by default** (`COVMON_MISREAD_LOG`) | `~/.3dgiordano-agent-plugins/misreads/` | Until you delete it; at most 50 entries | Delete the file |

The opt-in logs can hold short phrases of the agent's own messages and of code
it edited (clipped, at most 200 characters) and paths. They never leave your
machine.

The skill asks the agent to keep `.agent/progress.md` in your project; that
file is written by the agent, with your ordinary tools, and is yours to keep,
edit or delete. No hook writes it.

## Third parties

The plugins share nothing with anyone. The host that runs them (for example
Claude Code or Cursor) and the model provider it uses have their own privacy
policies, which govern your conversations; this policy covers only what these
plugins do.

## Children

The plugins are developer tools and are not directed at people under 18.

## Contact

Questions about this policy: open an issue at
<https://github.com/3dgiordano/agent-plugins/issues>. Security reports: see
[SECURITY.md](SECURITY.md) for private reporting.
