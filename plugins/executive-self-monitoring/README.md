![executive-self-monitoring logo](assets/logo.svg)

# executive-self-monitoring

Plan-anchored drift self-check for coding agents. Periodically nudges the agent
to **go read the active plan** — name the plan, quote its objective and gate,
compare recent actions against them — instead of drifting into tangents,
score-chasing, or "while I'm here" work.

It is a **self-check, not a blocker** — the plan defines the work; this just
prompts the agent to re-read it.

## Why it works: executive function, not "reflect harder"

The protocol is a fairly literal implementation of the executive functions a
human engineer runs in the background while deep in a task:

| Executive function (human) | In the skill |
|----------------------------|--------------|
| **Goal maintenance** — keep the objective in working memory | *Name the plan* — bring the active objective back into view |
| **Self-monitoring** — detect conflict between action and goal | *Compare* — do the last few actions serve the objective and move toward the gate? |
| **Inhibition** of the prepotent response | The drift signatures — the attractive tangent, the cheap optimization, the number that tempts |
| **Effort regulation** | *Calibrate effort* — depth proportional to what the gate needs |
| **Cognitive offloading** — use external aids because working memory is limited | The core principle: *drift is only visible against an external artifact*. Every activation reads the plan; none relies on memory of it |

The hook is the periodic **checkpoint** — the low-frequency interruption that
makes a person look up and ask "is this still what I was supposed to be doing?",
instead of trusting that the question will arise on its own mid-task. Agents
have no fatigue, no unease and no clock to trigger that question; the hook
supplies the trigger from outside.

Sibling plugins in this collection cover the other two questions — *is what I
concluded true?* (epistemic-self-monitoring) and *is it still worth insisting?*
(persistence-self-monitoring). This one only asks *am I doing what the plan
asks?*.

## How it's built

Two pieces that install as one unit:

- **Skill** (`skills/executive-self-monitoring/SKILL.md`) — the *what*: the
  5-step re-grounding protocol, a list of domain-neutral drift signatures, and
  the `[PLAN CHECK]` block as a markdown list in the message, not a fenced code
  block. This is the **single source of truth**; every host loads the same file.
- **Hook adapters** — the *when*. Hooks are not portable across hosts, so each
  host gets a thin adapter that only decides *when* to remind the agent to invoke
  the skill:

| Host | Adapter | Cadence |
|------|---------|---------|
| Claude Code, Codex | `hooks/exec-monitor.js` (`UserPromptSubmit`) | first turn of a session, then every Nth turn (`EVERY_N_TURNS`, default 5); again after a resume or a compaction (`hooks/exec-session-start.js`) |
| Claude Code | `hooks/exec-observe.js` (`PostToolUse`: Read, Write, Edit) + `exec-monitor.js` | on any prompt after a document the agent read changed on disk since its last Read, Write or Edit of it: names it, once per change |
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

## What it does on your machine

The hooks are Node scripts in `hooks/` and `lib/`, run by the host with `node`. They load only Node's `fs`, `os` and `path`, make no network call and start no process; nothing leaves the machine.

- **Reads:** the JSON event the host sends on stdin (session id, tool name, tool input and output, the final message), which is measured and never executed.
- **Reads, on Claude Code:** the modification time of the documents the agent read (`.md`, `.markdown`, `.txt`, `.rst`, `.adoc`) - never their text - so the next prompt can say that one changed on disk since the agent's last Read, Write or Edit of it (`lib/reads.js`). A change made through the shell, the agent's own included, is one such change. What it says is the path and that fact.
- **Writes:** one small state file per session in `<temp>/3dgiordano-agent-plugins/`, named `execmon_…` (the cadence counter, and on Claude Code the documents read with their modification times), kept for a resumed session and swept with this plugin's files there older than seven days; only with `EXECMON_LOG` set, the debug log below, under `<project>/.claude/logs/` or `<project>/.cursor/logs/`.
- **`evals/`** holds the cases `claude plugin eval` runs: prompts, graders and small fixture projects. The plugin never runs them.

The same rules for every plugin in the collection, and how to report a hook that breaks them, are in [SECURITY.md](https://github.com/3dgiordano/agent-plugins/blob/main/SECURITY.md).

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

## References

Inspiration for the design, or evidence that the problem exists; none of these tested this plugin. The full map, with the role of each reference, is in [docs/RESEARCH.md](https://github.com/3dgiordano/agent-plugins/blob/main/docs/RESEARCH.md); measured results are in [docs/EVIDENCE.md](https://github.com/3dgiordano/agent-plugins/blob/main/docs/EVIDENCE.md).

- Miyake, A., Friedman, N. P., et al. (2000). The unity and diversity of executive functions and their contributions to complex "frontal lobe" tasks. *Cognitive Psychology*, 41. [doi:10.1006/cogp.1999.0734](https://doi.org/10.1006/cogp.1999.0734)
- Arike, R., Donoway, E., Bartsch, H., Hobbhahn, M. (2025). Technical Report: Evaluating Goal Drift in Language Model Agents. [arXiv:2505.02709](https://arxiv.org/abs/2505.02709)
- Laban, P., Hayashi, H., Zhou, Y., Neville, J. (2025). LLMs Get Lost In Multi-Turn Conversation. [arXiv:2505.06120](https://arxiv.org/abs/2505.06120)
- Li, K., et al. (2024). Measuring and Controlling Instruction (In)Stability in Language Model Dialogs. [arXiv:2402.10962](https://arxiv.org/abs/2402.10962)
- Liu, N. F., et al. (2023). Lost in the Middle: How Language Models Use Long Contexts. [arXiv:2307.03172](https://arxiv.org/abs/2307.03172)

## Layout

```
.plugin/plugin.json               # Agent Plugins manifest (portable core; not at the root - see the repository README)
.claude-plugin/plugin.json        # Claude Code manifest
.codex-plugin/plugin.json         # Codex manifest (skills: ./skills, hooks: ./hooks/hooks.json)
.cursor-plugin/plugin.json        # Cursor manifest (skills: ./skills, hooks: ./cursor/hooks.json)
assets/                            # plugin mark (Cursor marketplace logo; shown at the top of this README)
skills/executive-self-monitoring/SKILL.md
hooks/hooks.json                  # Claude Code + Codex: SessionStart(resume|compact; startup|resume|clear|compact), UserPromptSubmit + PreToolUse(Skill) + PostToolUse(Read|Write|Edit) + SessionEnd
hooks/exec-monitor.js
hooks/exec-observe.js              # records the documents read and their mtime
hooks/exec-log-skill.js
hooks/exec-session-start.js         # a resumed or compacted session loads the discipline again
hooks/exec-session-end.js
hooks/exec-inject.js               # the skill's text at session start, after /clear or compaction
cursor/hooks.json                 # Cursor: sessionStart
cursor/exec-monitor-cursor.js
lib/execlog.js                    # shared opt-in logger
lib/host.js                       # cwdOf(): the project dir from the event, else the host env var, else null
lib/reads.js                      # documents read, their mtime; which changed since the agent's last Read, Write or Edit
```

Install instructions are in the [repository README](https://github.com/3dgiordano/agent-plugins/blob/main/README.md).
