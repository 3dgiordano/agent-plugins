<img src="assets/logo.svg" width="72" align="right" alt="">

# termination-self-monitoring

Checkable-reason discipline for coding agents. When the agent stops, defers,
narrows a task or softens a claim, the reason it gives must be one that can
be checked — and a whole family of reasons it produces fluently cannot be:
*running out of context*, *this has been a long session*, *let's pick this up
tomorrow*, *I'm not confident enough*, *given the complexity*, a run of
apologies. The plugin catches those phrases in the final message and asks
for the substitution: which of four checkable reasons actually holds — or
none, in which case the work continues.

It answers *"is this stop justified by something checkable?"* — the mirror of
[persistence-self-monitoring](../persistence-self-monitoring/), which answers
*"is it still worth insisting?"*. Persistence watches the agent stop too late,
on no signal; this one watches it stop too early, on a signal it does not have.

**Non-blocking by default.** Findings become a one-line retrospective on the
next prompt; `TERMMON_STRICT=1` turns the Stop into a gate that fires once.

## Why it works: a persona artifact, not a state

A language model inherits from its training data the reasons a *person* gives
for stopping — fatigue, the clock, a mood, a budget they are watching — and
produces them in the same register as everything else, in exactly the
positions a human would. The literature has names for each link in the chain:
the model is role-playing a character (Shanahan et al. 2023) whose traits leak
into its output as **persona artifacts**; the stated reason is **unfaithful**
to the actual cause of the decision (Turpin et al. 2023, Lanham et al. 2023);
the verbalized "not confident enough" is **uncalibrated** — a phrase, not a
probability (Kadavath et al. 2022); and the consequence in an agent loop is
**premature termination**, or its softer forms: narrowing, deferring, hedging.

None of that is a state the agent has, so there is nothing to supply from
outside — unlike the sibling plugins, this one *removes* something rather than
adding it. The mechanism is a substitution rule, not "reflect harder":

| Trigger category | Examples the scanner catches |
|------------------|------------------------------|
| budget | "I'm running out of context", "this has been a long session", "let's pick this up tomorrow" |
| confidence | "I'm not confident enough", "I don't feel comfortable", "I'd rather not risk" |
| complexity | "given the complexity", "too involved to tackle now", "out of scope for this turn" |
| apology run | three or more apologies / "I should have" in one message |

Any of them must be replaced by one of these, with its evidence — or by
`none`, which means continue:

| Checkable reason | Evidence it needs |
|------------------|-------------------|
| `gate-not-run` | which gate (test, build, review, metric), and why it has not run |
| `owner-choice` | the two non-equivalent options and what differs |
| `budget-spent` | the budget as pre-committed, and the count |
| `limit-observed` | the denied call, missing file, absent tool, full disk — and the tool that showed it |
| `none` | → continue |

A count from persistence-self-monitoring's hooks is evidence (`budget-spent`)
and overrides this plugin: a phrase never justifies stopping, a count can.
The two plugins are the two directions of one axis.

## How it's built

- **Skill** (`skills/termination-self-monitoring/SKILL.md`) — the protocol:
  name the trigger, test it against the four checkable reasons, decide from
  the reason, record a mistake in three sentences and continue, keep the
  register flat. Plus the termination failure signatures and the
  `[TERMINATION CHECK]` block (a markdown list in the message, not a fenced
  code block). Single source of truth; every host loads the
  same file.
- **Hook adapters** — two layers, same on both hosts:

| Layer | Claude Code | Cursor |
|-------|-------------|--------|
| **Load** the discipline | `UserPromptSubmit`: first turn, then every 10th; carries the retrospective | `sessionStart` → `additional_context` |
| **Stop** — scan the final message for trigger phrases and `[TERMINATION CHECK]` blocks | `Stop` reads `last_assistant_message` | `afterAgentResponse` scans `text`, `stop` acts on it |

The scanner (`lib/lexicon.js`) is first-person anchored — "I'm running out of
context" is a hit, "the user asked to continue tomorrow" is not — and strips
fenced code, inline code and quoted lines first, so a message that documents
or quotes these phrases is not judged for using them. One hit per category
per message; the block rules are:

- `Reason` is one of `gate-not-run | owner-choice | budget-spent | limit-observed | none`
- any reason other than `none` needs an `Evidence` line
- `Reason: none` means `Decision: continue`
- a trigger phrase with no block at all is the finding; so is an apology run
  (three or more apology / "I should have" phrases in one message)

Plain Node, no dependencies, **fail silent**: a hook error never blocks a
prompt or a stop.

## The termination gate — non-blocking by default, strict on request

**Default mode (non-blocking):** findings are written to the opt-in log and
carried into the next prompt as a one-line retrospective (Claude Code). The
turn ends normally.

**Strict mode** (`TERMMON_STRICT=1`): the gate blocks once. Claude Code: the
`Stop` hook exits 2 with the reason, so the agent names the checkable reason
— or continues — before finishing (`stop_hook_active` prevents a second
block). Cursor: the `stop` hook returns a `followup_message`, submitted once
(`loop_limit: 1`).

Blocking is more defensible here than in the epistemic gate, because the Stop
*is* the action being questioned. Even so, **run non-strict first** and look at
the log: how often do turns end on a trigger phrase, and how often does the
agent then continue on its own when the retrospective arrives? Only if the
retrospective is not enough is a forced extra turn worth its cost.

### What it does not catch

Silence. An agent that narrows the task without saying so writes no trigger
phrase and gets no nudge. That failure is about *what got delivered*, not the
reason given, and it belongs to [coverage-self-monitoring](../coverage-self-monitoring/).

Nor the *form* of a justified stop. `owner-choice` says the owner must pick;
how that choice is put to them — options with consequences, a default, one
action asked, in the reader's register — is
[handoff-self-monitoring](../handoff-self-monitoring/)'s `[HANDOFF]` block.

## Debug log (opt-in, off by default)

Off unless `TERMMON_LOG` is set (`1`/`true`/`yes`/`on`); with it unset the hooks
track nothing and write no files.

```
# PowerShell:  $env:TERMMON_LOG = "1"      $env:TERMMON_STRICT = "1"
# bash:        export TERMMON_LOG=1        export TERMMON_STRICT=1
```

JSONL under `<project>/.claude/logs/termination-self-monitoring.jsonl` (Claude
Code) or `<project>/.cursor/logs/…` (Cursor); override with
`TERMMON_LOG_HOST=claude|cursor`. Rotates at ~256 KB to a single `.1` backup.

| Event | Fields | Meaning |
|-------|--------|---------|
| `prompt` | `turn`, `load`, `retrospective` | cadence decision per user prompt (Claude Code) |
| `session_start` | — | once per Cursor session |
| `stop` | `hits`, `apologies`, `blocks`, `violations`, `strict`, `blocked` | per final message: which trigger phrases, how many apologies, block rules broken |
| `subagent_stop` | same as `stop`, plus `agent` | a subagent's final message. Measured only: never blocks even under `TERMMON_STRICT`, and never parks a retrospective |

```
# how often does a turn end on a state-shaped reason?
grep '"event":"stop"' .claude/logs/termination-self-monitoring.jsonl | grep -c '"hits":\[\]'
grep '"event":"stop"' .claude/logs/termination-self-monitoring.jsonl | grep -vc '"hits":\[\]'
```

## Layout

```
plugin.json                        # Agent Plugins manifest (portable core: skill only)
.claude-plugin/plugin.json         # Claude Code manifest
.cursor-plugin/plugin.json         # Cursor manifest (skills: ./skills, hooks: ./cursor/hooks.json)
assets/logo.svg                    # plugin mark (Cursor marketplace logo)
skills/termination-self-monitoring/SKILL.md
hooks/hooks.json                   # Claude Code: UserPromptSubmit, Stop, SubagentStop, SessionEnd
hooks/term-prompt.js
hooks/term-stop.js
hooks/term-session-end.js
cursor/hooks.json                  # Cursor: sessionStart, afterAgentResponse, stop
cursor/term-session-start.js   # also sweeps aged state (Cursor has no session-end event)
cursor/term-response-cursor.js
cursor/term-stop-cursor.js
lib/lexicon.js                     # trigger-phrase scanner + [TERMINATION CHECK] rules
lib/messages.js                    # reminder texts shared by both adapters
lib/state.js                       # per-session state (<temp>/3dgiordano-agent-plugins/); lockfile-guarded update(); remove()/sweep() drop it at session end
lib/host.js                        # cwdOf(): the project dir from the event, else the host env var, else null
lib/log.js                         # opt-in logger (per-plugin copy; plugins are self-contained)
```

On any other Agent Skills / Agent Plugins host the skill loads on its own: the
protocol and the block work without hooks; only the automatic reminders and
the gate are host-specific.

Install instructions are in the [repository README](../../README.md).
