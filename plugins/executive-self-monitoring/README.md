# executive-self-monitoring

Plan-anchored drift self-check for coding agents. Periodically nudges the agent
to **go read the active plan** — name the plan, quote its objective and gate,
compare recent actions against them — instead of drifting into tangents,
score-chasing, or "while I'm here" work.

It is a **self-check, not a blocker** — the plan defines the work; this just
prompts the agent to re-read it.

## How it's built

Two pieces that install as one unit:

- **Skill** (`skills/executive-self-monitoring/SKILL.md`) — the *what*: the
  5-step re-grounding protocol and a list of domain-neutral drift signatures.
  This is the **single source of truth**; every host loads the same file.
- **Hook adapters** — the *when*. Hooks are not portable across hosts, so each
  host gets a thin adapter that only decides *when* to remind the agent to invoke
  the skill:

| Host | Adapter | Cadence |
|------|---------|---------|
| Claude Code | `hooks/exec-monitor.js` (`UserPromptSubmit`) | first turn of a session, then every Nth turn (`EVERY_N_TURNS`, default 5) |
| Cursor | `cursor/exec-monitor-cursor.js` (`sessionStart`) | once per session |
| Agent Plugins client | *(none)* | skill only — the agent decides when to apply it |

All adapters are plain Node (ships with Claude Code and Cursor), have no
dependencies, and **fail silent**: a hook error never blocks a prompt.

Tune the Claude Code cadence by editing `EVERY_N_TURNS` at the top of
`hooks/exec-monitor.js`.

### Why Cursor only fires once

Cursor's hook model differs: `beforeSubmitPrompt` can only *block* a prompt, and
the only non-blocking injection point is `sessionStart`. So the Cursor adapter
injects the checkpoint once at session start (equivalent to the Claude Code
hook's "fire on turn 1"); the every-Nth-turn cadence is intentionally not
reproduced. The skill itself is available in Cursor for the agent to invoke at
any time.

## Extending the drift signatures

The skill ships with domain-neutral drift patterns (chasing a proxy instead of
the gate, restoring something that was reverted, closing on an unverified
assumption, re-litigating a dead end, scope creep, open-ended investigation).
Add your project's own recurring patterns in your project's `CLAUDE.md` or a
Cursor rule — keep the skill itself generic.

## Debug log (opt-in, off by default)

Logging is a debugging aid, not core functionality. It is **off unless the env
var `EXECMON_LOG`** is set (`1`/`true`/`yes`/`on`). With it unset the hooks
track nothing and write no files.

```
# PowerShell:  $env:EXECMON_LOG = "1"   (then start the host)
# bash:        export EXECMON_LOG=1
```

When enabled, the hooks append JSONL to a host-routed folder —
`<project>/.claude/logs/executive-self-monitoring.jsonl` under Claude Code,
`<project>/.cursor/logs/…` under Cursor (auto-detected; override with
`EXECMON_LOG_HOST=claude|cursor`). Event types:

- `{"event":"prompt","count":N,"emitted":true|false}` — one per user prompt
  (Claude Code), showing the cadence decision.
- `{"event":"skill","skill":"..."}` — one per **Skill tool invocation** (Claude
  Code, via a `PreToolUse` matcher on `Skill`). Shows whether the agent actually
  invoked `executive-self-monitoring` after the checkpoint, and doubles as a
  general skill-usage audit.
- `{"event":"session_start","host":"cursor"}` — one per Cursor session.

The log rotates at ~256 KB to a single `.1` backup, so disk use is bounded.
Add `.claude/logs/` / `.cursor/logs/` to your project's `.gitignore`.

```
# times the checkpoint was actually shown
grep '"emitted":true' .claude/logs/executive-self-monitoring.jsonl | wc -l

# did the agent ever invoke the skill?
grep '"event":"skill"' .claude/logs/executive-self-monitoring.jsonl | grep executive-self-monitoring
```

## Layout

```
plugin.json                       # Agent Plugins manifest (portable core)
.claude-plugin/plugin.json        # Claude Code manifest
.cursor-plugin/plugin.json        # Cursor manifest (skills: ./skills, hooks: ./cursor/hooks.json)
skills/executive-self-monitoring/SKILL.md
hooks/hooks.json                  # Claude Code: UserPromptSubmit + PreToolUse(Skill)
hooks/exec-monitor.js
hooks/exec-log-skill.js
cursor/hooks.json                 # Cursor: sessionStart
cursor/exec-monitor-cursor.js
lib/execlog.js                    # shared opt-in logger
```

Install instructions are in the [repository README](../../README.md).
