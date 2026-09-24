<img src="assets/logo.svg" width="72" align="right" alt="">

# progress-self-monitoring

Cross-session ledger discipline for coding agents. What a session leaves
open — the parts still **blocked** and why, the parts **returned** to the
owner and why, and the one **next action** — is written to a single file in
the project, `.agent/progress.md`, and re-opened by the next session before
it works. The hooks say what the ledger holds when a session opens (or
continues after a compaction), and notice a turn that edited files and left
a ledger with open items untouched.

It answers *"can the next session pick this up from a checkable record,
rather than from a transcript that was compacted, cleared or never
resumed?"* — the one question in this collection whose answer cannot live
in the message, because the message is what the session boundary drops.

**It never blocks.** There is no strict mode. The moment a gate would matter
most — the last turn of a session — is one no hook can reach without
blocking it, and whether that is worth a gate is measured (see the
`session_end` log event) rather than assumed.

## Why it works: the ledger is the block

Every other plugin here anchors the agent to something it writes into the
turn — a `[PLAN CHECK]`, a `[COVERAGE CHECK]`, a `[HANDOFF]`. That is the
right place for a check the *reader of this turn* needs. It is the wrong
place for what the *next session* needs, because a new chat, a `/clear`, a
resume that was not used, or a compaction drops the turn and keeps the
disk. The literature's name for the function is **prospective memory**:
remembering to act on an intention later, which people do by leaving the
intention somewhere they will look — not by holding it. The agent has no
"later" at all; what it has is the project directory, and the next session
will start in it.

So the residue lives at a fixed path, host-neutral (`.agent/`, not
`.claude/` or `.cursor/`), in a shape a hook can count without reading the
prose: `- blocked: <reason>` and `- returned: <reason>` lines under
`## Open`, the two closing states of the coverage skill that leave a part
open. The vocabulary is strict; the formatting — bullet style, checkbox,
bold, case, indentation — is not, because an agent writing markdown
decorates, and a scanner refusing a correct line over that has been the
most repeated defect in this collection.

What the hooks add is what the agent cannot weigh from inside the turn:
whether the file exists, how many items it has open, and whether the
turn's edits touched it.

## How it's built

- **Skill** (`skills/progress-self-monitoring/SKILL.md`) — the protocol:
  re-open before you work, residue only, the two open states are
  coverage's, write it in the turn that produced it, keep it current then
  small. Plus the failure signatures and the file's shape. Single source of
  truth; every host loads the same file.
- **Hook adapters** — the parser and the file check live in
  `lib/ledger.js`, the turn counters in `lib/signals.js`; each host wires
  them to its events:

| | Claude Code | Cursor |
|---|-------------|--------|
| **Session boundary** — the ledger has open items: say how many and how old | `SessionStart` (startup, resume, clear, **and compact**) → text | `sessionStart` → `additional_context` |
| **Turn boundary** — stamp the turn's start, reset the edit counter, load the skill on turn 1, carry the retrospective | `UserPromptSubmit` | `sessionStart` (load) + `afterAgentResponse` (reset) |
| **Boundary named in the prompt** — the user says the work continues in a later session | `UserPromptSubmit` → names the ledger | — (no per-prompt event) |
| **The sweep** — what the agent wrote it would do later, handed back two turns on, once each | `Stop` collects → `UserPromptSubmit` asks | `afterAgentResponse` collects → **log only** |
| **Edit counter** — did this turn write files; did it write the ledger | `PostToolUse`, no matcher, silent | `postToolUse`, silent |
| **Close** — edits this turn, ledger with open items not written this turn | `Stop` → finding parked; **next prompt** carries it, once per ledger version | `afterAgentResponse` → **log only** (no injection point after the response) |
| **Session end** — how did it end: open items, stale or not | `SessionEnd` → log, then cleanup | — (no event; state is swept by age at the next `sessionStart`) |

The first prompt also carries the session-boundary status when
`SessionStart` did not run — some host modes fire one event and not the
other — and never repeats it when it did.

### Signals and thresholds

| Signal | Condition | Notes |
|--------|-----------|-------|
| status | ledger exists, `open ≥ 1`, age ≤ `MAX_AGE_DAYS` (14) | at session start and after compaction; the count and the age, never the text |
| stale | `open ≥ 1` **and** the turn made ≥ 1 file edit **and** the ledger was not written this turn (mtime before the turn's start, and no edit-tool call on its path) | reported on the next prompt, **once per ledger version** — a rewrite changes the mtime and re-arms it |
| spans | the prompt says the work continues in a later session ("later session", "pick this up next week", "across sessions", ...) | fenced and inline code stripped; "session" as a cookie, a store, an id or "this session" is a labelled miss (`evals/corpus/progress-prompt.jsonl`) |
| sweep | the agent's final message commits to a later act in this session — first person, deferred, with a "when": "I'll update the docs once the tests pass", "let me come back to X after Y", "next I'll ...", "noted for later" | kept in session state (at most 8), quoted back at the prompt `SWEEP_AFTER_TURNS` (2) turns later, once each. Offers ("if you want, I'll..."), deferrals out of the delivery ("for a follow-up PR"), the past, other agents' futures, code and quotes are labelled misses (`evals/corpus/progress-commitments.jsonl`) |
| grown | `open > MAX_OPEN_ITEMS` (8), or non-blank `lines > MAX_LINES` (40), or `bytes > 64 KB` | one clause on the status message, with the numbers: closed items are removed, not marked — a ledger is bounded by pruning, and a `## Done` section grows forever |
| silence | no ledger; `open = 0`; older than `MAX_AGE_DAYS`; a turn with no edits; a subagent's close | a ledger nobody keeps is left alone rather than announced forever |

Why the stale signal needs the edit count: without it, ten turns of
questions next to an old ledger would be ten reminders. With it, the signal
is "the work moved and the record did not", which is rare and is the
finding.

Why the sweep quotes: "is there anything you might be forgetting?" works on
a person because it starts a search over a memory. The agent has none to
search beyond the context in view, and asked bare it answers as fluently as
it answers anything — "no, that is everything". The question is only
answerable with the inventory attached, and the one inventory the agent
cannot re-read is what it wrote it would do. So the hook keeps those lines
and hands each back once, quoted, with the turn count: the answer has to be
about that line. It is the intra-session half of the same function the
ledger serves across sessions — prospective memory — and what the sweep
finds unfinished at the end is what goes under `## Open`.

Whether the ledger is committed is the project's call. Tracked, it is shared
history — a teammate's session picks up where yours stopped. Ignored
(`.agent/progress.md` in `.gitignore`), it is a per-checkout notebook that
no `git checkout` ever touches, which also keeps its mtime honest. The hooks
do not care which; this repository ignores its own.

What the hook reads: one fixed path, `<project>/.agent/progress.md`, at
most 64 KB, for its mtime and its open-item count. It never writes the file
— the agent does, with its ordinary tools — and no message carries any of
its text. That is the whole of this plugin's project I/O, and it is the one
place in the collection where a hook reads a project file at all;
[SECURITY.md](../../SECURITY.md) says so.

**Boundary with executive-self-monitoring.** The plan is the plan's;
`Plan:` in the ledger points at it and never restates it. Executive re-reads
the plan on a cadence *inside* the session; this plugin makes the residue
reach the *next* one.

**Boundary with coverage-self-monitoring.** Coverage closes the parts of
the current request in the `[COVERAGE CHECK]`. What that check leaves
`blocked` or `returned`, and the session will not resolve, is what goes
under `## Open` — same two words, so the two agree. Coverage does not
persist; progress does not enumerate.

**Boundary with handoff-self-monitoring.** `[HANDOFF]` → `Next` is for the
reader of this turn; the ledger's `Next:` is for the next session. Often the
same line, written twice for two readers at two times.

**Boundary with termination-self-monitoring.** "I'll pick this up next
session" is still a stop on a phrase unless the ledger says what is blocked
and by what. The ledger records a checkable reason; it does not supply one.

Plain Node, no dependencies, **fail silent**: a hook error never blocks a
session start, a prompt, a tool call, or a stop.

## What the user sees

The hooks speak to the model; without a notice the user sees nothing unless
the agent writes the block. So when a session starts next to a ledger with
open items, a turn edits files and leaves the ledger untouched, and the sweep
hands back a commitment, the hook also returns one line for the user -
top-level `systemMessage`, which Claude Code and Codex show in the transcript
and do not add to the model's context:

```
[progress self-monitoring] <the finding> - <what the agent is asked to do>
```

The load message and the cadence reminders carry no news and stay silent; a
subagent's close is not the user's and stays silent. Cursor has no
user-visible field on the events this plugin uses (`sessionStart`,
`postToolUse`, `afterAgentResponse` - `user_message` exists only on permission
hooks), so nothing shows there. Off with `PROGRESSMON_NOTICE=0`.

## Debug log (opt-in, off by default)

Off unless `PROGRESSMON_LOG` is set (`1`/`true`/`yes`/`on`); with it unset
the hooks track nothing and write no files.

```
# PowerShell:  $env:PROGRESSMON_LOG = "1"
# bash:        export PROGRESSMON_LOG=1
```

JSONL under `<project>/.claude/logs/progress-self-monitoring.jsonl` (Claude
Code) or `<project>/.cursor/logs/…` (Cursor); override with
`PROGRESSMON_LOG_HOST=claude|cursor`. Rotates at ~256 KB to a single `.1`
backup.

| Event | Fields | Meaning |
|-------|--------|---------|
| `session_start` | `source`, `exists`, `open`, `lines`, `bytes`, `bloated`, `ageMs`, `emitted` | a session opened or continued after compaction; was the status injected; had the ledger outgrown a page |
| `prompt` | `turn`, `open` (turn 1 only), `retrospective`, `spans`, `swept` | per user prompt: was a stale finding carried; did the prompt name a later session; how many commitments were handed back |
| `stop` | `exists`, `open`, `ageMs`, `stale`, `fired`, `commitments`, `tools`, `edits`, `ledgerEdited` | per final message: did this turn leave the ledger stale; was it reported (Claude Code parks it for the next prompt; Cursor logs only); how many forward commitments the message made |
| `subagent_stop` | same as `stop`, plus `agent` | a subagent's close. Measured only — never parked: its edits are the parent's turn |
| `session_end` | `reason`, `turns`, `exists`, `open`, `stale`, `edits` | how the session ended. `open > 0 && stale` is the case no retrospective can reach — the count a strict gate would be argued from |

```
# how often does a session end with open items and a ledger its last turn did not update?
grep '"event":"session_end"' .claude/logs/progress-self-monitoring.jsonl | grep -c '"stale":true'
# how often does a session open on a ledger with open items?
grep '"event":"session_start"' .claude/logs/progress-self-monitoring.jsonl | grep -c '"emitted":true'
```

`node scripts/calibrate.js <project>` reads these and prints the what-if
rates, including the age distribution behind `MAX_AGE_DAYS`.

## Evals

Three cases under `evals/`, graded on the **file** after the run rather
than on the reply — the runners copy a case's `files/` into the scratch
workspace first, keep `.agent/progress.md` beside the transcript
afterwards, and score it by the rules in the case's `case.json`:

| Case | Seeds | Scores |
|------|-------|--------|
| `keeps-the-residue` | a changelog | a task with one part blocked by an observed limit and "we'll continue later": the ledger exists with that part under `## Open` |
| `keeps-a-returned-decision` | the same package and ledger as below | a prompt that closes the blocked item and says nothing about the question returned to the owner: the ledger updated, the returned item still the owner's (exactly one open). Measured 3 of 3 with, 0 of 3 without, on both hosts |
| `reopens-the-ledger` | a small package, a first session's scripts and a ledger with two open items: one `blocked`, one question `returned` to the owner | a prompt that never mentions a previous session, closes the first and asks to "sort out" the second: the ledger re-opened and updated, the publish item gone. Measured 3 of 3 with, 0 of 3 without - the baseline never opens a ledger nothing points at |
| `stays-quiet-on-a-question` | nothing | a one-line question: no ledger written |

## Layout

```
.plugin/plugin.json                # Agent Plugins manifest (portable core: skill only; not at the root - see the repository README)
.claude-plugin/plugin.json         # Claude Code manifest
.codex-plugin/plugin.json          # Codex manifest (skills: ./skills, hooks: ./hooks/hooks.json)
.cursor-plugin/plugin.json         # Cursor manifest (skills: ./skills, hooks: ./cursor/hooks.json)
assets/logo.svg                    # plugin mark (Cursor marketplace logo)
skills/progress-self-monitoring/SKILL.md
hooks/hooks.json                   # Claude Code + Codex: SessionStart, UserPromptSubmit, PostToolUse, Stop, SubagentStop, SessionEnd
hooks/prog-session-start.js        # ledger status at the session boundary (and after compaction)
hooks/prog-prompt.js               # turn start stamp, load on turn 1, status fallback, retrospective
hooks/prog-observe.js              # edit counter; silent
hooks/prog-stop.js                 # edits vs. ledger mtime; parks the finding, once per ledger version
hooks/prog-session-end.js          # logs how the session ended, then drops the state
cursor/hooks.json                  # Cursor: sessionStart, postToolUse, afterAgentResponse
cursor/prog-session-start.js       # load + status; also sweeps aged state (no session-end event)
cursor/prog-observe-cursor.js
cursor/prog-response-cursor.js     # log only
lib/ledger.js                      # the parser (openItems) and the one project read (inspect)
lib/signals.js                     # per-turn counters, the stale rule, spansSessions()
lib/commitments.js                 # the sweep: scan() the agent's message for later-this-session commitments; remember()/due()
lib/messages.js                    # reminder texts shared by both adapters
lib/state.js                       # per-session state (<temp>/3dgiordano-agent-plugins/); lockfile-guarded update(); remove()/sweep()
lib/host.js                        # cwdOf(): the project dir from the event, else the host env var, else null
lib/log.js                         # opt-in logger (per-plugin copy; plugins are self-contained)
evals/                             # three behavioural cases, graded on the file
```
