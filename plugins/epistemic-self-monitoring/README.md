# epistemic-self-monitoring

Observation-vs-conjecture discipline for coding agents. Keeps what the agent
**saw** apart from what it **thinks it means**, and makes the difference visible:
a claim carries its evidence and a named falsifier, and only a claim that
survived that falsifier may become a fact, a defect entry, or a closure.

It answers *"is what I concluded actually true?"* — the sibling of
[executive-self-monitoring](../executive-self-monitoring/), which answers *"am I
doing what the plan asks?"*.

**Being wrong is fine. Recording an unverified conjecture as a fact is not.**

## Why it works: source monitoring, not "be more careful"

Humans have a running sense of *where a belief came from* — "I saw it", "I
worked it out", "someone told me" — and a felt difference between the three.
Cognitive psychology calls it **source monitoring**. Coding agents state all
three with the same confidence, and a plausible first explanation slides into
"the cause is X" with nothing in between.

The skill replaces the missing feeling with a written ladder:

| Rung | Requires |
|------|----------|
| `[observed]` | the tool/command it came from |
| `[conjecture]` | a **falsifier** committed in advance, and its **scope** |
| `[verified — by: …]` | what was actually run and what it looked at |
| fact / defect / closure | only a `[verified]` claim |

…and two habits that do most of the work before any test runs: **read the
authority first** (plan, docs, prior attempts, the actual code — most
conjectures die there), and **name the strongest rival explanation** before
choosing your own.

## How it's built

- **Skill** (`skills/epistemic-self-monitoring/SKILL.md`) — the protocol, the
  claim ladder, the rival-explanation checklist, the closure checks, and the
  `[EPISTEMIC CLOSE]` block format. Single source of truth; every host loads
  the same file.
- **Hook adapters** — three layers, same on both hosts:

| Layer | Claude Code | Cursor |
|-------|-------------|--------|
| **Load** the discipline | `UserPromptSubmit`: first turn, then every 10th | `sessionStart` → `additional_context` |
| **Observe** — expectation vs. observation nudge right after a shell result | `PostToolUse` (matcher `Bash`) → `additionalContext`; every 6th command, or on failure-looking output (rate-limited) | `postToolUse` (self-filtered to shell tools) → `additional_context` |
| **Close** — scan the final message for `[EPISTEMIC CLOSE]` blocks | `Stop` reads `last_assistant_message` | `afterAgentResponse` scans `text`, `stop` acts on it |

Cadence constants sit at the top of each adapter (`EVERY_N_TURNS`,
`EVERY_N_COMMANDS`, `MIN_GAP_ON_ERROR`).

Plain Node, no dependencies, **fail silent**: a hook error never blocks a
prompt, a tool call, or a stop.

## The closure gate — non-blocking by default, strict on request

The **Close** layer checks three rules on any `[EPISTEMIC CLOSE]` block the agent
wrote:

- `Status: conjecture` needs a `Falsifier`
- `Status: verified` needs a `Verified by`
- every block needs a `Scope`

No block means no closure was declared, so there is nothing to judge. The gate
never guesses from prose; it only reads the artifact the skill asks for. That
keeps false positives near zero and leaves the agent nothing to game except the
block's own content — which stays visible to you.

**Default mode (non-blocking):** findings are written to the opt-in log and
carried into the next prompt as a one-line retrospective (Claude Code). The
turn ends normally.

**Strict mode** (`EPIMON_STRICT=1`): the gate blocks once. Claude Code: the
`Stop` hook exits 2 with the reason, so the agent fixes the block before
finishing (`stop_hook_active` prevents a second block). Cursor: the `stop`
hook returns a `followup_message`, submitted once (`loop_limit: 1`).

**Run non-strict first.** The skill's own closure check applies to the plugin:
*a mechanism that fires is not one that helps*. Log for a while, look at how
often closures come out with a missing falsifier or an empty "Verified by",
and only then decide whether blocking is worth a forced extra turn per
closure — and whether it raised the rate of *verification* or only the rate of
*tags*.

## Debug log (opt-in, off by default)

Off unless `EPIMON_LOG` is set (`1`/`true`/`yes`/`on`); with it unset the hooks
track nothing and write no files.

```
# PowerShell:  $env:EPIMON_LOG = "1"      $env:EPIMON_STRICT = "1"
# bash:        export EPIMON_LOG=1        export EPIMON_STRICT=1
```

JSONL under `<project>/.claude/logs/epistemic-self-monitoring.jsonl` (Claude
Code) or `<project>/.cursor/logs/…` (Cursor); override with
`EPIMON_LOG_HOST=claude|cursor`. Rotates at ~256 KB to a single `.1` backup.

| Event | Fields | Meaning |
|-------|--------|---------|
| `prompt` | `turn`, `load`, `retrospective` | cadence decision per user prompt (Claude Code) |
| `session_start` | — | once per Cursor session |
| `observe` | `shell`, `failed`, `emitted` | per shell command: did the nudge fire |
| `close` | `blocks`, `tags`, `violations`, `strict`, `blocked` | per final message: closure scan result |
| `stop` | `status`, `violations`, `blocked` | Cursor stop decision |

```
# how often do closures come out incomplete?
grep '"event":"close"' .claude/logs/epistemic-self-monitoring.jsonl | grep -c '"violations":\[\]'
grep '"event":"close"' .claude/logs/epistemic-self-monitoring.jsonl | grep -vc '"violations":\[\]'
```

## Layout

```
plugin.json                        # Agent Plugins manifest (portable core: skill only)
.claude-plugin/plugin.json         # Claude Code manifest
.cursor-plugin/plugin.json         # Cursor manifest (skills: ./skills, hooks: ./cursor/hooks.json)
skills/epistemic-self-monitoring/SKILL.md
hooks/hooks.json                   # Claude Code: UserPromptSubmit, PostToolUse(Bash), Stop
hooks/epi-prompt.js
hooks/epi-observe.js
hooks/epi-stop.js
cursor/hooks.json                  # Cursor: sessionStart, postToolUse, afterAgentResponse, stop
cursor/epi-session-start.js
cursor/epi-observe-cursor.js
cursor/epi-response-cursor.js
cursor/epi-stop-cursor.js
lib/scan.js                        # [EPISTEMIC CLOSE] block parser + rules
lib/messages.js                    # reminder texts shared by both adapters
lib/state.js                       # per-session counters + pending findings (OS temp dir)
lib/log.js                         # opt-in logger (per-plugin copy; plugins are self-contained)
```

On any other Agent Skills / Agent Plugins host the skill loads on its own: the
protocol and the closure block work without hooks; only the automatic reminders
and the gate are host-specific.

Install instructions are in the [repository README](../../README.md).
