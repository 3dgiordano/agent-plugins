<img src="assets/logo.svg" width="72" align="right" alt="">

# persistence-self-monitoring

Persist-or-quit self-check for coding agents. Counts the two things an agent
cannot feel — **repeating variants of the same attempt** and **effort out of
proportion to the request** — and, only when a threshold is crossed, hands the
agent the number and asks for an explicit decision: one more try with a stop
condition, switch approach, step back to the plan, or report to the user.

It answers *"is it still worth insisting on this?"* — the third question of the
collection, after *am I doing what the plan asks?*
([executive-self-monitoring](../executive-self-monitoring/)) and *is what I
concluded true?* ([epistemic-self-monitoring](../epistemic-self-monitoring/)).

**It never blocks.** The value is the objective count at the right moment; the
judgment stays with the agent — and with the user, who sees the decision.

## Why it works: a prosthesis for the missing feeling

In Carver and Scheier's control model there are two loops: one reduces the
distance to the goal, and a second one **monitors the rate at which that
distance shrinks**. Its output is affect — progress slower than expected feels
like frustration, and frustration is what makes a person stop, look up and
change strategy. Agents have no such loop: no fatigue, no clock, no unease.
Variant #7 of a failing idea is produced with the same confidence as variant
#1, and the classic executive failure — *perseveration*, repeating the response
that already failed instead of shifting — is the default, not the exception.

The hooks supply the missing signal from outside. They cannot feel either, but
they can count, and a count delivered at the moment of the fourth edit to the
same file does the job the feeling would have done.

## How it's built

- **Skill** (`skills/persistence-self-monitoring/SKILL.md`) — the protocol:
  name the hypothesis held, count the variants, name an incompatible rival,
  check proportion, decide and say which. Plus the persistence failure
  signatures (variant cycling, whack-a-mole, retry without change, environment
  fighting, rabbit hole, sunk cost) and the `[PERSISTENCE CHECK]` block (a
  markdown list in the message, not a fenced code block).
- **Hook adapters** — the counters live in `lib/signals.js`; each host wires
  them to its events:

| | Claude Code | Cursor |
|---|-------------|--------|
| **Turn boundary** (reset counters; first turn loads the skill) | `UserPromptSubmit` | `sessionStart` (load) + `afterAgentResponse` (reset) |
| **Count every tool call**, nudge on threshold | `PostToolUse`, no matcher → `additionalContext` | `postToolUse` → `additional_context` |
| **Turn summary** to the log | `Stop` (log only, never blocks) | `afterAgentResponse` |

Cursor has no non-blocking per-prompt event (`beforeSubmitPrompt` can only
block), so its turn boundary is the end of the agent's response instead of the
start of the user's message — same effect, one event later.

### Signals and thresholds

All counts are **per turn** — since the user's last message — because a user
message is where a human re-enters the loop. Each signal fires exactly when its
threshold is crossed (and again at each multiple), never on every call:

| Signal | Threshold | What counts |
|--------|-----------|-------------|
| `edits` | same file edited **4** times | any tool whose name looks like an edit (`Edit`, `Write`, `NotebookEdit`, `edit_file`, …), keyed by file path |
| `cmds` | same shell command failing **3** times | shell-like tools whose output looks like a failure, keyed by the normalized command |
| `errs` | same error signature **3** times | the first error-naming line of a failed output, with numbers, hex ids and paths blanked — so a retry that only moved a line number still counts as the same error |
| `effort` | **30** tool calls, then every 30 | every tool call |

Thresholds are constants at the top of `lib/signals.js` (`EDITS_SAME_FILE`,
`REPEAT_FAILURES`, `TOOL_CALLS_STEP`).

"Looks like a failure" is decided by `lib/fail.js`, line by line, and never by
the bare words *error* or *failed* — a green Jest run prints `0 failed`, a
grep for "error handling" prints the word. What counts: a non-zero exit code
line, a Python traceback, `fatal:` / `panic:`, a non-zero `N failed` /
`N errors` count, `npm ERR!`, `make: ***`, a line starting with `FAIL` /
`FAILED`, an `Error:` / `SomethingError:` / `error[E…]:` / `error TS…:` line,
an assertion failure, "command not found" and friends. The host's structured
`{stdout, stderr}` result is read as text, not stringified, so the
line-anchored rules see real lines. The same file, byte for byte, drives the
epistemic plugin's observe nudge.

The nudge carries the count — *"you have edited `src/a.js` 4 times this turn"*,
*"`npm test` has failed 3 times this turn"* — and asks for the hypothesis held,
what changed between attempts, and what the agent would do if the hypothesis
were wrong. When the epistemic-self-monitoring plugin is installed, that last
question is its "strongest rival explanation" step; the two compose without
either depending on the other.

Plain Node, no dependencies, **fail silent**: a hook error never blocks a
prompt, a tool call, or a stop.

## Debug log (opt-in, off by default)

Off unless `PERSISTMON_LOG` is set (`1`/`true`/`yes`/`on`); with it unset the
hooks still count (in `<temp>/3dgiordano-agent-plugins/`) but write no log files.

```
# PowerShell:  $env:PERSISTMON_LOG = "1"
# bash:        export PERSISTMON_LOG=1
```

JSONL under `<project>/.claude/logs/persistence-self-monitoring.jsonl` (Claude
Code) or `<project>/.cursor/logs/…` (Cursor); override with
`PERSISTMON_LOG_HOST=claude|cursor`. Rotates at ~256 KB to a single `.1` backup.

| Event | Fields | Meaning |
|-------|--------|---------|
| `prompt` | `turn` | turn boundary (Claude Code) |
| `session_start` | — | once per Cursor session |
| `signal` | `tools`, `signals[]` | a threshold was crossed; which signal, key and count |
| `turn` | `tools`, `maxEditsSameFile`, `maxRepeatCmd`, `maxRepeatErr` | per-turn summary — the data to tune thresholds against real sessions |

```
# how many turns crossed a threshold, and which signal fires most
grep '"event":"signal"' .claude/logs/persistence-self-monitoring.jsonl | grep -o '"kind":"[a-z]*"' | sort | uniq -c

# distribution of tool calls per turn (are 30 the right step?)
grep '"event":"turn"' .claude/logs/persistence-self-monitoring.jsonl | grep -o '"tools":[0-9]*' | sort -t: -k2 -n | uniq -c
```

## Layout

```
.plugin/plugin.json                 # Agent Plugins manifest (portable core: skill only; not at the root - see the repository README)
.claude-plugin/plugin.json          # Claude Code manifest
.codex-plugin/plugin.json           # Codex manifest (skills: ./skills, hooks: ./hooks/hooks.json)
.cursor-plugin/plugin.json          # Cursor manifest (skills: ./skills, hooks: ./cursor/hooks.json)
assets/logo.svg                    # plugin mark (Cursor marketplace logo)
skills/persistence-self-monitoring/SKILL.md
hooks/hooks.json                    # Claude Code + Codex: UserPromptSubmit, PostToolUse (all), Stop, SessionEnd
hooks/persist-prompt.js
hooks/persist-observe.js
hooks/persist-stop.js
hooks/persist-session-end.js
cursor/hooks.json                   # Cursor: sessionStart, postToolUse, afterAgentResponse
cursor/persist-session-start.js   # also sweeps aged state (Cursor has no session-end event)
cursor/persist-observe-cursor.js
cursor/persist-response-cursor.js
lib/signals.js                      # the counters + thresholds (host-neutral)
lib/messages.js                     # reminder texts shared by both adapters
lib/fail.js                         # did a shell output look like a failure? line rules, no bare "error"/"failed" (per-plugin copy)
lib/state.js                        # per-session turn state (<temp>/3dgiordano-agent-plugins/); lockfile-guarded update(); remove()/sweep() drop it at session end
lib/host.js                         # cwdOf(): the project dir from the event, else the host env var, else null
lib/log.js                          # opt-in logger (per-plugin copy; plugins are self-contained)
```

On any other Agent Skills / Agent Plugins host the skill loads on its own; the
thresholds are listed in it so the agent can apply them by hand.

Install instructions are in the [repository README](../../README.md).
