<img src="assets/logo.svg" width="72" align="right" alt="">

# coverage-self-monitoring

Parts-ledger discipline for coding agents. Before a multi-part or hard task
the agent writes down the parts, names the hardest one and why, and takes it
first; at the end every part is closed as **done**, **blocked** with an
observed reason, or **returned** to the owner — never silently dropped. The
hooks count the stubs, placeholders and `TODO`s written per turn, ask for the
ledger when the prompt enumerates three or more items, and notice deferral
language in the final message that no closing ledger accounts for.

It answers *"does what I delivered cover every part of the request, including
the hard one?"* — the complement of
[executive-self-monitoring](../executive-self-monitoring/), which asks whether
the work is *outside* the plan. This one asks whether it is *below* it.

**It never blocks.** A wrong "you deferred X" costs one line on the next
prompt; as a blocked stop it would cost a turn.

## Why it works: a ledger, not more effort

Agents do not avoid hard parts; there is nothing in them to be averse with.
What happens is plainer: the continuation of least cost is sampled with the
same fluency as any other, and the tractable subset of a task reads exactly
like a finished task. The literature has names for the result — **goal
substitution** / specification gaming (Krakovna et al. 2020), **shortcut**
solutions (Geirhos et al. 2020), **partial task completion**, and **compute
misallocation**: the reasoning budget did not go where the difficulty was
(the *underthinking* line of work on reasoning models). The easy parts get
done; the hard part becomes a stub, a "simplified version", or a follow-up.

None of this is visible from inside the turn — a stub compiles, a summary
that omits a part reads as complete. So the mechanism is **external
anchoring**, the same principle as the executive plugin: a ledger written
*before* the work, while the hard part is still just a name, and a closing
check against it. The hooks add what the agent cannot weigh — a count of the
markers it wrote, and the deferral phrases it used.

## How it's built

- **Skill** (`skills/coverage-self-monitoring/SKILL.md`) — the protocol:
  write the ledger, hardest part first, a stub is a debt, close every part in
  one of three states, compare the closing ledger to the opening one. Plus the
  coverage failure signatures and the `[COVERAGE LEDGER]` / `[COVERAGE CHECK]`
  blocks (markdown lists in the message, not fenced code blocks). Single source of truth; every host loads the same file.
- **Hook adapters** — the counters and scanners live in `lib/signals.js`;
  each host wires them to its events:

| | Claude Code | Cursor |
|---|-------------|--------|
| **Turn boundary** — reset counters; first turn loads the skill | `UserPromptSubmit` | `sessionStart` (load) + `afterAgentResponse` (reset) |
| **Ledger prompt** — the user's message enumerates ≥ 3 items | `UserPromptSubmit` → text | — (no non-blocking per-prompt event) |
| **Stub counter** — markers written per turn, nudge on threshold | `PostToolUse`, no matcher → `additionalContext` | `postToolUse` → `additional_context` |
| **Close scan** — deferral phrases vs. `[COVERAGE CHECK]` | `Stop` → findings to state; next prompt carries the retrospective | `afterAgentResponse` → log only |

### Signals and thresholds

| Signal | Threshold | What counts |
|--------|-----------|-------------|
| parts | ≥ 3 enumerated items in the prompt (`PARTS_MIN`) | bullet or numbered lines outside code fences |
| stubs | 3 markers written this turn, then every 3 (`STUBS_STEP`) | lines written by an edit tool that carry `TODO` / `FIXME` / `XXX` / `HACK`, `not implemented` / `NotImplemented` / `unimplemented`, `placeholder`, "rest of the code here", a bare `// ...`, `pass  # TODO`, "left as an exercise" — **net of what the edit replaced**, so moving an existing `TODO` is not a new one. One line is one marker. Bare `stub` and `mock` are excluded: test doubles are legitimate code |
| deferrals | any, at Stop | "in a follow-up PR", "left as a TODO", "not yet implemented", "simplified / basic / minimal version", "out of scope", "remaining work", "still needs", "can be added later", "would require a separate pass" — in prose only (fenced code, inline code and quoted lines are stripped) |

How "net" is computed depends on what the host sends:

| Host sends | Counted |
|-----------|---------|
| Claude Code's structured result (`structuredPatch` on Write and Edit) | markers on `+` lines minus markers on `-` lines — a rewrite of a legacy file full of old `TODO`s nets to zero |
| Claude Code Write with `type: 'create'` | every marker in the new file — a new file made of `TODO`s is new debt |
| `old_string` / `new_string` or `edits[]` in the tool input, no result | new minus old |
| a bare snippet (`new_string`, Cursor's `code_edit`) with nothing replaced | what the snippet adds; Cursor's `// ... existing code ...` marker is not a stub |
| whole-file `content` with no result to compare against | **nothing** — a missed new file is cheaper than a false alarm on every rewrite |

The close-scan rules:

- deferral language with no `[COVERAGE CHECK]` block is the finding;
- a `blocked` or `returned` line needs the reason after it (`- part: blocked - <observed limit>`);
- a block with no part lines at all is a finding.

**Boundary with termination-self-monitoring.** Both plugins look at the final
message, so the phrases are split by kind: this one catches deferral of a
*part* (what was not delivered — "in a follow-up", "simplified version");
termination catches a state-shaped *reason* (why — "given the complexity",
"out of scope for this turn", "not confident enough"). "Out of scope" alone
lands here; "out of scope for this turn" lands there. A blocked part whose
reason is a mood fails the termination check, which sends it back here as
not blocked.

**Boundary with handoff-self-monitoring.** A `returned` part says the owner
must choose; [handoff-self-monitoring](../handoff-self-monitoring/) makes sure
the choice reaches them formulated — its scanner reads the `returned` lines of
the `[COVERAGE CHECK]` and asks for a `[HANDOFF]` block (options with their
consequences, a default, one next action) when there is none. Coverage says
*which* parts are open; handoff says it in the reader's terms.

**Boundary with progress-self-monitoring.** The ledger here lives in the
turn and closes with it. What the `[COVERAGE CHECK]` leaves `blocked` or
`returned` and the session will not resolve is what
[progress-self-monitoring](../progress-self-monitoring/) keeps on disk, in
`.agent/progress.md`, under the same two words — so the next session opens
on the parts this one could not close, with their reasons.

Plain Node, no dependencies, **fail silent**: a hook error never blocks a
prompt, a tool call, or a stop.

## What the user sees

The hooks speak to the model; without a notice the user sees nothing unless
the agent writes the block. So when the stop scan finds deferred work with no
`[COVERAGE CHECK]` (or an incomplete one), and when the stub counter crosses
its threshold, the hook also returns one line for the user - top-level
`systemMessage`, which Claude Code and Codex show in the transcript and do not
add to the model's context:

```
[coverage self-monitoring] <the finding> - <what the agent is asked to do>
```

The load message and the cadence reminders carry no news and stay silent; a
subagent's close is not the user's and stays silent. Cursor has no
user-visible field on the events this plugin uses (`sessionStart`,
`postToolUse`, `afterAgentResponse` - `user_message` exists only on permission
hooks), so nothing shows there. Off with `COVMON_NOTICE=0`.

## When the scan misreads

The close scan reads a lexicon of words, not what a sentence does with them:
an option offered to the owner ("empezar por el esqueleto") or "lo que queda"
of a mechanism reads as deferred work. So the reminder on the next prompt
quotes each phrase in the sentence it was read in, says the reading can be
wrong, and gives the answer for that case - one line in the
`[COVERAGE CHECK]`:

```
- "el esqueleto": misread - an option offered to the owner, not a stub
```

A misread line needs its reason, and it is taken only for a phrase the scan
raised (the previous turn's, or one in the same message), so it cannot
silence a phrase in advance. A taken one is not raised again this session
(up to 32 phrases), and the user sees it as a notice:

```
[coverage self-monitoring] the agent answered "el esqueleto" as a misreading: an option offered to the owner, not a stub - not raised again this session
```

## Misread log (for the maintainer, off by default)

A user cannot change a pattern, so what the disputes teach is for whoever
maintains the lexicon in `lib/signals.js`. With it unset nothing is written,
and the dispute works the same.

| `COVMON_MISREAD_LOG` | Records |
|----------------------|---------|
| `1`/`true`/`yes`/`on` | every taken dispute |
| `all` | also every phrase the scan raised, in its sentence - the trace a reviewer judges, and the only one on Cursor, where no reminder reaches the agent and so no dispute is written |

```
# PowerShell:  $env:COVMON_MISREAD_LOG = "1"
# bash:        export COVMON_MISREAD_LOG=1
```

The repository's eval and bench runners keep one file per invocation beside
the run as `<base>.misreads.json`: on Claude Code and Codex the Stop hook
writes it (`all`); on Cursor headless, which fires no `afterAgentResponse`,
the runner runs this `scanClose` on each turn's final message itself.

- **Where:** `~/.3dgiordano-agent-plugins/misreads/coverage-self-monitoring.json`,
  outside every project, and named in no message or skill text the agent
  reads. `COVMON_MISREAD_FILE` overrides the path.
- **No duplicates:** one entry per pattern and phrase. A repeat raises
  `raised` or `misread` and `last`; up to 3 distinct sentences are kept per
  entry, the newest, a disputed one with the agent's reason.
- **Bounded:** at most 50 entries, the most recently seen kept.
- **Read it:** `node scripts/misreads.js` in this repository prints the
  entries by count; `--md` writes a review sheet with a verdict column;
  `--clear` empties the file. Given results directories instead, it merges
  their `*.misreads.json`.

An entry is the agent's word, not a verdict. Confirm it, add the sentence to
the test suite as a miss, and only then change the pattern.

## Debug log (opt-in, off by default)

Off unless `COVMON_LOG` is set (`1`/`true`/`yes`/`on`); with it unset the hooks
track nothing and write no files.

```
# PowerShell:  $env:COVMON_LOG = "1"
# bash:        export COVMON_LOG=1
```

JSONL under `<project>/.claude/logs/coverage-self-monitoring.jsonl` (Claude
Code) or `<project>/.cursor/logs/…` (Cursor); override with
`COVMON_LOG_HOST=claude|cursor`. Rotates at ~256 KB to a single `.1` backup.

| Event | Fields | Meaning |
|-------|--------|---------|
| `prompt` | `turn`, `parts`, `ledger`, `retrospective` | per user prompt: enumerated items, ledger asked, findings carried (Claude Code) |
| `session_start` | — | once per Cursor session |
| `signal` | `stubs`, `signals` | stub threshold crossed: count and files |
| `stop` | `deferrals`, `blocks`, `parts`, `violations`, `misreads`, `tools`, `stubs`, `stubFiles` | per final message: deferral phrases, closing ledger, phrases answered as misread, turn totals |
| `subagent_stop` | same as `stop`, plus `agent` | a subagent's final message. Measured only: never blocks, and never parks a retrospective — a subagent has no next user prompt to carry one, so parking would deliver it to the parent's turn |

```
# how often does a turn end with deferred work and no closing ledger?
grep '"event":"stop"' .claude/logs/coverage-self-monitoring.jsonl | grep -c '"violations":\[\]'
grep '"event":"stop"' .claude/logs/coverage-self-monitoring.jsonl | grep -vc '"violations":\[\]'
```

## Layout

```
.plugin/plugin.json                # Agent Plugins manifest (portable core: skill only; not at the root - see the repository README)
.claude-plugin/plugin.json         # Claude Code manifest
.codex-plugin/plugin.json          # Codex manifest (skills: ./skills, hooks: ./hooks/hooks.json)
.cursor-plugin/plugin.json         # Cursor manifest (skills: ./skills, hooks: ./cursor/hooks.json)
assets/logo.svg                    # plugin mark (Cursor marketplace logo)
skills/coverage-self-monitoring/SKILL.md
hooks/hooks.json                   # Claude Code + Codex: UserPromptSubmit, PostToolUse, Stop, SubagentStop, SessionEnd
hooks/cov-prompt.js
hooks/cov-observe.js
hooks/cov-stop.js
hooks/cov-session-end.js
cursor/hooks.json                  # Cursor: sessionStart, postToolUse, afterAgentResponse
cursor/cov-session-start.js   # also sweeps aged state (Cursor has no session-end event)
cursor/cov-observe-cursor.js
cursor/cov-response-cursor.js
lib/signals.js                     # stub counter, prompt parts, close scan + [COVERAGE CHECK] rules
lib/messages.js                    # reminder texts shared by both adapters
lib/state.js                       # per-session state (<temp>/3dgiordano-agent-plugins/); lockfile-guarded update(); remove()/sweep() drop it at session end
lib/host.js                        # cwdOf(): the project dir from the event, else the host env var, else null
lib/log.js                         # opt-in logger (per-plugin copy; plugins are self-contained)
```

On any other Agent Skills / Agent Plugins host the skill loads on its own: the
ledger and the closing check work without hooks; only the counters and the
automatic reminders are host-specific.

Install instructions are in the [repository README](../../README.md).
