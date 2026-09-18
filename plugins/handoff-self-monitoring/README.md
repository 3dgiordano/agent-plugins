<img src="assets/logo.svg" width="72" align="right" alt="">

# handoff-self-monitoring

Structured-handoff discipline for coding agents. At the end of a turn the
agent knows where the work stands, what the problem is and what the owner has
to decide — and writes a close in the register of its own trace: paths,
identifiers, what it ran, ending where the work ended. The reader, who has the
message and not the trace, cannot tell what to decide or what to do next. The
plugin anchors the close to a `[HANDOFF]` block modelled on the handoff
protocols of nursing, aviation and medicine — status first, the situation in
the reader's terms, the fork as options with a default, one action asked of
the reader — puts that format in front of the agent at the moment the turn
starts to look finished, and flags a final message that names a decision
without handing it off.

It answers *"can the reader act on what I wrote?"* — the transmission side of
[epistemic-self-monitoring](../epistemic-self-monitoring/), which answers *"is
what I concluded true?"*. Knowing and having transmitted are two functions;
this one covers the second.

**Non-blocking by default.** Findings become a one-line retrospective on the
next prompt; `HANDMON_STRICT=1` turns the Stop into a gate that fires once.

## Why it works: a handoff protocol, not "explain better"

The failure has three names in the literature. The **curse of knowledge**
(Camerer, Loewenstein & Weber 1989) and the **expert blind spot**: whoever
already has the full trace cannot see which parts are opaque to someone who
only has the message — every identifier the agent uses in its close is
transparent to it because it just saw it. The **illusion of transparency**
(Gilovich, Savitsky & Medvec 1998): the speaker overestimates how much of its
internal state reads through — the agent *has* the decision clear, and
assumes naming the problem makes the decision implicit. And **writer-based
prose** (Flower 1979): text organised as the writer's process — *I read X,
changed Y, ran Z* — rather than around what the reader needs to act.

None of this is a knowledge failure: the information is in the trace. It is a
transmission failure, and the remedy that works for human experts in the same
position is not better intentions but a **fixed format with the
recommendation as a mandatory field**. Nursing and aviation use **SBAR**
(Situation, Background, Assessment, Recommendation); medicine uses **I-PASS**
(Illness severity, Patient summary, Action list, Situation awareness,
Synthesis by receiver). Both exist because free-form handoff by someone who
knows the state failed exactly this way. The `[HANDOFF]` block is that format
for an agent's turn:

| SBAR | I-PASS | `[HANDOFF]` |
|------|--------|-------------|
| Situation | Illness severity | `Status: done \| needs-decision \| blocked` — one word the reader triages on |
| Background | Patient summary | `Situation` — what the reader has now, in their terms; the trace-register detail goes *below* the block |
| Assessment | Situation awareness / contingency | `Options` as a list, `Default` on its own line, or `Blocked-by` |
| Recommendation | Action list | `Next` — the one action asked of the reader, or `nothing` |
| — | Synthesis by receiver | the reader's reply; a hook cannot do it for them |

The other half of the design is *when*. A reminder at the start of the turn is
thirty tool calls away by the time the close is written; scaffolding (Wood,
Bruner & Ross 1976) works when it is **contingent** — present when the actor
cannot do that part alone — and **in the moment**. So the format is injected on
the first closing-shaped tool call of the turn — a green test run, a commit,
a PR opened — which is the moment the final message is about to be written.
That layer is also what reaches the silent case: the agent that has the
decision clear and does not mention it writes no phrase a scanner could
catch, but it does run the tests first.

## How it's built

- **Skill** (`skills/handoff-self-monitoring/SKILL.md`) — the protocol:
  status first; the situation in the reader's terms; a fork written as a
  decision with a default, not offered as a favour; one action asked; blocked
  means observed; the block is the close, not an appendix. Plus the handoff
  failure signatures and the `[HANDOFF]` block. Single source of truth; every
  host loads the same file.
- **Hook adapters** — three layers, same on both hosts:

| Layer | Claude Code | Cursor |
|-------|-------------|--------|
| **Load** the discipline | `UserPromptSubmit`: first turn, then every 10th; carries the retrospective; resets the turn | `sessionStart` → `additional_context` |
| **Pre-close** — inject the format on the first closing-shaped tool call of the turn | `PostToolUse` → `additionalContext`, once per turn | `postToolUse` → `additional_context`, once per turn |
| **Stop** — scan the final message for a decision not handed off and for `[HANDOFF]` blocks | `Stop` reads `last_assistant_message` | `afterAgentResponse` scans `text` and resets the turn, `stop` acts on it |

The pre-close signal (`lib/signals.js`) counts two shapes of tool call: a
test / build / lint runner whose output shows no failure (`lib/fail.js`, the
same copy the persistence and epistemic plugins use — a red run is not a
close), and `git commit` / `git push` / a PR or MR opened. It fires on the
first of them, once per turn.

The scanner (`lib/handoff.js`) looks for four things in the prose of the
final message, one hit per kind, after stripping fenced code, inline code,
quoted lines and the `[HANDOFF]` block itself:

| Kind | What it catches |
|------|-----------------|
| offer | "let me know", "if you want", "would you like me to", "should I", "up to you", "your call" — the assessment handed to the reader |
| fork | "it depends on", "alternatively", "two options", "the other approach", "trade-off" — a fork named, not decided |
| question | a line ending on `?` within the last 6 lines of the message |
| returned | a `returned` part in a `[COVERAGE CHECK]` — coverage says the owner must choose; handoff asks that the choice reach them formulated |

Any hit with no `[HANDOFF]` block is the finding. When there is a block, the
rules are:

- `Status` is one of `done | needs-decision | blocked` (a qualifier may follow)
- `needs-decision` needs `Options` with at least two alternatives (a list
  under `Options`, one choice per line; a `|` / `vs` line is still accepted)
  and a `Default` (own line, or trailing on `Options`)
- `blocked` needs `Blocked-by`
- `Situation` and `Next` are required; a template placeholder counts as empty

The lexicon is English, like the sibling plugins'; the question and
`returned` signals are language-neutral. Write the block as a **markdown
list in the message, not inside a fenced code block** — fences do not wrap,
and a long `Options` line becomes a horizontal scroll. One option per line;
`Default` on its own line. The rules check the *form* of the block — that
the options are well chosen, that the situation is really in the reader's
register, is the skill's discipline, in the same way nobody checks that an
epistemic `[verified]` line is true.

Plain Node, no dependencies, **fail silent**: a hook error never blocks a
prompt, a tool call or a stop.

## The handoff gate — non-blocking by default, strict on request

**Default mode (non-blocking):** findings are written to the opt-in log and
carried into the next prompt as a one-line retrospective (Claude Code). The
turn ends normally.

**Strict mode** (`HANDMON_STRICT=1`): the gate blocks once. Claude Code: the
`Stop` hook exits 2 with the reason, so the agent writes the block before
finishing (`stop_hook_active` prevents a second block). Cursor: the `stop`
hook returns a `followup_message`, submitted once (`loop_limit: 1`).

The gate is the only layer that can change *this* close: the Stop is the sole
event that sees the final message, and there is no "about to write the final
message" event on either host. Without it, the plugin is the skill, the
pre-close scaffold and a retrospective that educates the next turn. Run
non-strict first and read the log: how often does a close name a decision
without formulating it, and how often does the agent write the block on its
own once the pre-close nudge arrives? Only if that is not enough is a forced
extra turn worth its cost.

### What it does not catch

A close that is silent about a decision *and* had no closing-shaped tool
call — a diagnosis turn that ends on a wall of identifiers with no question,
no offer and no test run. The scanner has nothing to match and the pre-close
layer had nothing to fire on. The load reminder and the skill text are all
that reach that turn; the retrospective cannot, because there is no finding.

Nor does it judge the *content* of a block — the rules are structural.

### Living with the sibling blocks

The four closing blocks coexist in one message and each plugin reads only
its own: `[EPISTEMIC CLOSE]` (is the claim true), `[COVERAGE CHECK]` (which
parts are open), `[TERMINATION CHECK]` (why the stop is justified) and
`[HANDOFF]` (what the reader does with it). The only cross-read is this
plugin's scanner looking for `returned` lines in the `[COVERAGE CHECK]`.
Coverage's deferral scan reads the whole prose, a `[HANDOFF]` included — so a
`Next:` line that says a part is *out of scope* still wants the coverage
ledger; that is the intended division, not a conflict. In strict mode the
three gates can each block the same Stop once; the host runs them all, the
agent sees every reason, and `stop_hook_active` / `loop_limit` keep any of
them from firing twice.

## Relation to the sibling plugins

- **coverage-self-monitoring** closes each part of the request as done,
  blocked or `returned`; handoff makes sure a `returned` part reaches the
  owner as a formulated choice. Coverage activates on multi-part tasks;
  handoff applies to any turn, including one where everything is `done` —
  a cryptic close of complete work is still a bad handoff.
- **termination-self-monitoring** tests the *reason* for a stop; handoff
  formats the *stop itself* for the reader. A `blocked` with no observation
  is a termination case first.
- **epistemic-self-monitoring** is the knowing side; this is the
  transmitting side. A `done` in the block carries the same evidence rule as
  a `[verified]` line.

## Debug log (opt-in, off by default)

Off unless `HANDMON_LOG` is set (`1`/`true`/`yes`/`on`); with it unset the
hooks track nothing and write no files.

```
# PowerShell:  $env:HANDMON_LOG = "1"      $env:HANDMON_STRICT = "1"
# bash:        export HANDMON_LOG=1        export HANDMON_STRICT=1
```

JSONL under `<project>/.claude/logs/handoff-self-monitoring.jsonl` (Claude
Code) or `<project>/.cursor/logs/…` (Cursor); override with
`HANDMON_LOG_HOST=claude|cursor`. Rotates at ~256 KB to a single `.1` backup.

| Event | Fields | Meaning |
|-------|--------|---------|
| `prompt` | `turn`, `load`, `retrospective` | cadence decision per user prompt (Claude Code) |
| `session_start` | — | once per Cursor session |
| `signal` | `tools`, `signals: [{kind: closing, what: gate\|commit, label}]` | the pre-close nudge fired |
| `stop` | `hits`, `blocks`, `status`, `violations`, `preclose`, `tools`, `strict`, `blocked` | per final message: which kinds hit, whether a block was there and complete, whether the pre-close nudge had fired this turn |
| `subagent_stop` | same as `stop`, plus `agent` | a subagent's final message. Measured only: never blocks even under `HANDMON_STRICT`, and never parks a retrospective |

```
# how often does a close name a decision and not hand it off?
grep '"event":"stop"' .claude/logs/handoff-self-monitoring.jsonl | grep -c '"hits":\[\]'
grep '"event":"stop"' .claude/logs/handoff-self-monitoring.jsonl | grep -vc '"hits":\[\]'
# ... and how often was the block written after the pre-close nudge?
grep '"preclose":true' .claude/logs/handoff-self-monitoring.jsonl | grep -c '"blocks":1'
```

`node scripts/calibrate.js <project>` prints these as rates alongside the
other plugins'.

## Layout

```
plugin.json                        # Agent Plugins manifest (portable core: skill only)
.claude-plugin/plugin.json         # Claude Code manifest
.cursor-plugin/plugin.json         # Cursor manifest (skills: ./skills, hooks: ./cursor/hooks.json)
assets/logo.svg                    # plugin mark (Cursor marketplace logo)
skills/handoff-self-monitoring/SKILL.md
hooks/hooks.json                   # Claude Code: UserPromptSubmit, PostToolUse, Stop, SubagentStop, SessionEnd
hooks/hand-prompt.js
hooks/hand-observe.js
hooks/hand-stop.js
hooks/hand-session-end.js
cursor/hooks.json                  # Cursor: sessionStart, postToolUse, afterAgentResponse, stop
cursor/hand-session-start.js   # also sweeps aged state (Cursor has no session-end event)
cursor/hand-observe-cursor.js
cursor/hand-response-cursor.js
cursor/hand-stop-cursor.js
lib/handoff.js                     # final-message scanner + [HANDOFF] rules
lib/signals.js                     # pre-close signal: first green gate or commit of the turn
lib/fail.js                        # did a shell output look like a failure? (copy shared with persistence / epistemic)
lib/messages.js                    # reminder texts shared by both adapters
lib/state.js                       # per-session state (<temp>/3dgiordano-agent-plugins/); lockfile-guarded update(); remove()/sweep() drop it at session end
lib/host.js                        # cwdOf(): the project dir from the event, else the host env var, else null
lib/log.js                         # opt-in logger (per-plugin copy; plugins are self-contained)
```

On any other Agent Skills / Agent Plugins host the skill loads on its own: the
protocol and the block work without hooks; only the automatic reminders, the
pre-close scaffold and the gate are host-specific.

Install instructions are in the [repository README](../../README.md).
