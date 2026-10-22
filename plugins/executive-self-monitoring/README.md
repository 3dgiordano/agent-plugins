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
| Claude Code, Codex | `hooks/exec-monitor.js` (`UserPromptSubmit`) | first turn of a session, then every Nth turn (`EVERY_N_TURNS`, default 5); again after a compaction, not after a resume, whose transcript comes back with the last checkpoint in it (`hooks/exec-session-start.js`) |
| Claude Code | `hooks/exec-observe.js` (`PostToolUse`: Read, Write, Edit, and Bash or PowerShell) + `exec-monitor.js` | on any prompt after a document the agent read changed on disk since its last Read, Write or Edit of it, or its own shell command that names it: names it, once per change |
| Claude Code, Codex | `exec-monitor.js` + `hooks/exec-stop.js` (`Stop`), `lib/writeback.js` | the plan write-back. The plan is the file the agent's latest [PLAN CHECK] names in `Plan`, whatever its name (read from the turn's blocks at the close), or, when no block has named a file, the one the `Plan:` line of `.agent/progress.md` points at. At the owner's third deciding prompt (a pick, an approval) since that file last changed - once it has been kept in the session - and on the second prompt after a [PLAN CHECK] that decided `revise-plan` if it has not changed since: one line, naming no file |
| Claude Code, Codex | `hooks/exec-inject.js` (`SubagentStart`) + `hooks/exec-subagent-stop.js` (`SubagentStop`) | a subagent gets the skill's text at its start; at its close its reads are dropped, and with the opt-in log its [PLAN CHECK] and reads are measured, never gated |
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

## The objective, not the last approved step (1.9.0)

A long piece of work moves forward in steps the owner approves one at a time,
and each step can carry a gate of its own. Two things can then go wrong
without any single step being wrong:

- the check anchors to the latest step - the option the owner just picked, a
  pre-registration, a results section - and quotes that step's gate as if it
  were the plan's;
- a revision moves the work to another part (a hand-written rule, a component
  brought in from elsewhere), and the gate can now pass while the part the
  objective names does nothing. Re-opening the changed plan does not by
  itself bring the objective back into view.

So `Plan` now carries the objective line quoted beside the artifact's name,
an approved option or a derived document is quoted as serving the plan, and
after a revision the skill asks one question: could the gate pass with the
part the objective names doing nothing? If it could, that is `revise-plan`,
the owner's call. The changed-document line asks the same question.

Not shown: that the change moves the rate. A four-turn replay of that arc on
a toy world (`bench/executive-self-monitoring/the-gate-the-tracker-passes`)
passes without any plugin on Opus 5.5 (one run): with the objective one
screen away, the model ablated the component and answered the question on
its own. The failure needs the length of a long session, which a short case
does not reproduce.

## Extending the drift signatures

The skill ships with domain-neutral drift patterns (chasing a proxy instead of
the gate, restoring something that was reverted, closing on an unverified
assumption, re-litigating a dead end, scope creep, open-ended investigation,
a gate a substitute passes, the last approved step taken for the plan).
Add your project's own recurring patterns in your project's `CLAUDE.md` or a
Cursor rule — keep the skill itself generic.

## What it does on your machine

The hooks are Node scripts in `hooks/` and `lib/`, run by the host with `node`. They load only Node's `fs`, `os` and `path`, make no network call and start no process; nothing leaves the machine.

- **Reads:** the JSON event the host sends on stdin (session id, tool name, tool input and output, the final message), which is measured and never executed.
- **Reads, on Claude Code:** the modification time of the documents the agent read (`.md`, `.markdown`, `.txt`, `.rst`, `.adoc`) - never their text - so the next prompt can say that one changed on disk since the agent's last Read, Write or Edit of it (`lib/reads.js`). A change made through the shell, the agent's own included, is one such change. What it says is the path and that fact. From 1.9.0 each agent keeps its own reads: a subagent's read of the plan is not the main agent's, and a subagent's edit of a document the main agent read is a change the main agent is told about at its next prompt (on Cursor, where no subagent id is read yet, one record as before). A subagent's reads are deleted at its close. For the plan write-back (1.9.0) it also reads the opening words of the owner's prompt, to tell a decision (an option letter, an approval) from anything else; at the close of a turn, the turn's part of the session transcript (its last 2 MB, the agent's text since the owner's prompt; the final message when the transcript cannot be read), for the `[PLAN CHECK]` blocks' `Plan` path and `revise-plan`; the `Plan:` line of `.agent/progress.md`, when the project keeps one and no block has named a file; and the modification time of the file either names. It keeps that path, a count and a time - no text - and says no file name.
- **Writes:** one small state file per session in `<temp>/3dgiordano-agent-plugins/`, named `execmon_…` (the cadence counter, and on Claude Code the documents read with their modification times and the plan write-back's count of decisions; a subagent's reads in a file of their own, ending `--<agent id>.reads.json`, deleted when it stops), kept for a resumed session and swept with this plugin's files there older than seven days; only with `EXECMON_LOG` set, the debug log below, under `<project>/.claude/logs/` or `<project>/.cursor/logs/`.
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

- `{"event":"prompt","count":N,"emitted":true|false,"writeback":null|"decisions"|"revision"}` — one per user prompt; `writeback` says which plan write-back line it carried
  (Claude Code), showing the cadence decision.
- `{"event":"skill","skill":"..."}` — one per **Skill tool invocation** (Claude
  Code, via a `PreToolUse` matcher on `Skill`). Shows whether the agent actually
  invoked `executive-self-monitoring` after the checkpoint, and doubles as a
  general skill-usage audit.
- `{"event":"subagent_stop","actor":"...","agent":"...","reads":N,"blocks":N,"decision":"...","violations":[...]}` —
  one per subagent close (Claude Code): the documents it read and its
  `[PLAN CHECK]`, measured only.
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
hooks/hooks.json                  # Claude Code + Codex: SessionStart(resume|compact; startup|resume|clear|compact), SubagentStart, UserPromptSubmit + PreToolUse(Skill) + PostToolUse(Read|Write|Edit) + Stop + SessionEnd + SubagentStop
hooks/exec-monitor.js
hooks/exec-observe.js              # records the documents read and their mtime
hooks/exec-log-skill.js
hooks/exec-session-start.js         # a compacted session loads the discipline again; a resumed one keeps it
hooks/exec-session-end.js
hooks/exec-inject.js               # the skill's text at session start, after /clear or compaction, and for a subagent
hooks/exec-subagent-stop.js        # a subagent's close: measured (opt-in log), its reads dropped
hooks/exec-stop.js                 # the main agent's close: the plan its [PLAN CHECK] names, and a revise-plan, for the plan write-back
cursor/hooks.json                 # Cursor: sessionStart
cursor/exec-monitor-cursor.js
lib/execlog.js                    # shared opt-in logger
lib/writeback.js                  # the plan write-back: decisions since the plan last changed, an answered revise-plan
lib/host.js                       # cwdOf(): the project dir from the event, else the host env var, else null
lib/reads.js                      # documents read, their mtime; which changed since the agent's last Read, Write or Edit
```

Install instructions are in the [repository README](https://github.com/3dgiordano/agent-plugins/blob/main/README.md).
