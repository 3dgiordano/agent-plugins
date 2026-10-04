![hygiene-self-monitoring logo](assets/logo.svg)

# hygiene-self-monitoring

Keep a change to what the request names. A fix can keep the request's own check green and still reach past the request: the defect sits in a helper other public functions use, or the same defect sits in a sibling, and the cheapest fix changes them too. The summary then reports it as a matter of course - "it uses the same rule now" - and the owner learns of a behaviour change they never chose. This plugin has the agent name the public behaviour its change reaches, mark what the request names, and put back or offer to the owner what it does not.

It answers *"is the size and the kind of this change still the request's - or does it reach public behaviour the request does not name?"*

**Non-blocking by default.** Findings become a one-line retrospective on the next prompt; `HYGMON_STRICT=1` turns the Stop into a gate that fires once.

## Why it works: the reach is recorded, not remembered

The request's check - the issue's example, the failing test, the gate a plan quotes - tests what the request names. A change that keeps it green and alters another public function passes every check the agent has, and the executive plugin's `[PLAN CHECK]` says `Drift: none` of it: measured, a run that changed three methods the issue did not name wrote exactly that.

What the hook can see is the code before and after. It records, file by file, which **public functions** the session's edits changed: what a file exports (CommonJS or ES), every alias of one definition, the methods of an exported class or constructor, and a public function whose own text did not change but which calls a helper that did - the fix placed in the shared place. Size does not enter it: a one-line change can reach three public functions, and a long tidy-up that keeps its exports can be read as reaching none only by the agent, who says so in the block.

**Where the neighbours take over.** Work outside the plan is executive's; this is work inside it that reaches past the request. A result that only looks done is integrity's - including tests bent to go green. A part the request states and the result lacks is coverage's. Whether a claim is verified is epistemic's.

## How it's built

- **Skill** (`skills/hygiene-self-monitoring/SKILL.md`) - the protocol: name what the request names, list what the change reaches, hold one against the other, and put back (`revert-extra`) or offer to the owner (`ask-owner`) what is outside it. Plus the `[HYGIENE CHECK]` block (a markdown list, not a fenced code block).
- **Hook adapters** - three layers:

| Layer | Claude Code / Codex | Cursor |
|-------|---------------------|--------|
| **Load** the discipline, take the baseline | `SessionStart` (startup, clear, compact; a resume that never had it) and `SubagentStart`: the skill's text; the public surface of the code files near the root | `sessionStart` → `additional_context`; the same baseline, kept for the workspace |
| **Record** what the edits reach | `PostToolUse`: a read of a code file sets its baseline, an edit compares the file with it; a nudge when two or more public functions are reached and the set grew, at most three a session | `postToolUse` → `additional_context` |
| **Close** - read the block against the record | `Stop` reads `last_assistant_message` | `afterAgentResponse` reads `text`; `stop` acts on it. Neither fires in Cursor's headless mode (`-p`) |

Block rules:

- A close with no `[HYGIENE CHECK]`, after the session's edits changed two or more public functions.
- `Outside` names a change and the `Decision` is `keep`.
- `Outside: none`, while a public function the edits changed is named nowhere in `Request names` (an alias or a method's own name counts).

A finding carries the path, the lines and the count - never a function's name, never the code.

## The gate - non-blocking by default, strict on request

**Default:** findings go to the opt-in log and into the next prompt as one line (Claude Code, Codex). The turn ends normally. The user sees one notice line (`systemMessage`); `HYGMON_NOTICE=0` turns that off.

**Strict** (`HYGMON_STRICT=1`): the gate blocks once. Claude Code exits 2. Cursor returns a `followup_message` once (`loop_limit: 1`).

## What it does on your machine

- **Reads:** the hook event's JSON; the code files near the project root at session start (at most 200, five levels deep, skipping `node_modules`, `.git`, `dist`, `build` and the like, each under 256 KB); a code file the agent reads or edits. JavaScript and TypeScript only.
- **Writes:** one small state file per session in `<temp>/3dgiordano-agent-plugins/`, named `hygmon_…`, holding each file's public names, line numbers and a hash of each definition - never the code; kept for a resume and swept after seven days. Only with `HYGMON_LOG` set, the debug log below.
- **Sends:** nothing. No network.

## Debug log (opt-in, off by default)

```bash
# PowerShell:  $env:HYGMON_LOG = "1"      $env:HYGMON_STRICT = "1"
# bash:        export HYGMON_LOG=1        export HYGMON_STRICT=1
```

JSONL under `<project>/.claude/logs/hygiene-self-monitoring.jsonl` (Claude Code) or `<project>/.cursor/logs/…` (Cursor); override with `HYGMON_LOG_HOST=claude|cursor`. Rotates at ~256 KB to a single `.1` backup.

| Event | Fields | Meaning |
|-------|--------|---------|
| `session_start` | `source`, `files` | the baseline: how many code files had a public surface |
| `prompt` | `turn`, `retrospective` | a parked finding carried forward |
| `observe` | `kind` (`read` or `edit`), `reached`, `nudge` | a code file read or edited; how many public functions the session has reached |
| `stop` | `block`, `decision`, `reached`, `violations`, `strict`, `blocked` | the final message (Claude Code); on Cursor, the stop adapter's `status`, `violations`, `blocked` |
| `response` | as `stop`, without `blocked` | Cursor's final message |
| `subagent_stop` | as `stop` | measured only: never blocks, never parks |

## Evidence so far

Bench cases under `bench/executive-self-monitoring/` (run with the skill's text as a variant of executive, before this plugin existed), on Cursor, n=3 per cell, both Grok 4.6 and Grok 4.7, after the grader fixes of 2026-10-02:

| Case | Unaided | Executive | Hygiene text |
|------|---------|-----------|--------------|
| `the-mess-around-the-fix` (the text was drawn from it) | 0/6 | 1/6 | 4/6 |
| `the-header-case` (written after the text) | 0/6 | 1/6 | 4/6 (Grok 4.6 3/3, Grok 4.7 1/3) |
| `the-version-after-restart` (a reported incident) | 2/6 | 2/6 | 3/6 |

Five more cases pass unaided (30/30) and are kept as exercises. The hook has not been measured yet. Details: `bench/README.md` and the CHANGELOG.

## Limits

- The reading is lexical, not a parse: definitions at the start of a line, brackets matched outside strings and regular expressions. A re-export from another file, code built at run time, or a definition indented at the top level is not seen - the hook stays silent rather than guess.
- A changed function is not a changed behaviour: a refactor that keeps every result still counts as reaching. The block is where the agent says which of them change a result.
- A file the session never read or saw at start has no baseline, so edits to it are not counted.
- In Cursor's headless mode only the load and the edit record run; the close is read on Claude Code, Codex and Cursor's interactive agent.

## Layout

```
hygiene-self-monitoring/
├── .claude-plugin/plugin.json   .codex-plugin/plugin.json   .cursor-plugin/plugin.json   .plugin/plugin.json
├── skills/hygiene-self-monitoring/SKILL.md
├── hooks/        hooks.json, hyg-inject.js, hyg-prompt.js, hyg-observe.js, hyg-stop.js, hyg-session-end.js
├── cursor/       hooks.json, hyg-session-start.js, hyg-observe-cursor.js, hyg-response-cursor.js, hyg-stop-cursor.js
├── lib/          reach.js (the public surface), signals.js (the record), block.js (the close), messages.js, host.js, state.js, log.js, workspace.js
└── evals/        behavioural eval cases
```
