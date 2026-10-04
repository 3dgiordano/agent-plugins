![aspiration-self-monitoring logo](assets/logo.svg)

# aspiration-self-monitoring

Review before you close. The first version that meets the letter of a request comes out as fluently as a finished one, and it is easy to call it done - often right after a change nobody reviewed. This plugin keeps the close at the objective the result has to reach, checked against the result itself, the way it will be used - a document read, an image viewed, a program run, a page rendered, a sound played - and against a source the agent did not write: the original it reproduces, the specification it follows, the real input, the owner's words.

It answers *"did I review the result after my last change, in the medium it will be used in, and does it hold, point by point, against a source I did not write - or only against my memory of it?"*

**Non-blocking by default.** Findings become a one-line retrospective on the next prompt; `ASPMON_STRICT=1` turns the Stop into a gate that fires once.

## Why it works: the review is counted, not felt

A job title does not raise the bar. "Act as a designer" gives the agent a costume and no observation that could reject the result. The bar has to be the objective the owner asked for, stated as a property that a passage, an output, a screenshot, a sound or the owner's last words could prove wrong - and it has to be held against the result, not against the agent's memory of it. Reviewing is not perceiving: the review compares what the result has with what the source has. A criterion written from memory and a result made from the same memory agree by construction, so `meets` is a claim about a comparison with a source outside the agent, never an impression; a difference the agent names is a defect unless something outside it tolerates the difference.

What the hook can see is the order of the turn's tool calls. An **edit** is a write / edit / patch tool that names a file. What **reviews** it depends on what the file is:

| The file | Is reviewed by |
|---|---|
| a document or data: text, markdown, csv, json, yaml, pdf, docx... | reading it: a read tool on that path, or a command that names it |
| an image: png, jpg, gif, webp... | viewing it: a read tool on that path (hosts show the image), a command that names it, or a browser / preview / screenshot tool |
| anything else: code, markup, styles, svg, audio, video | running or rendering it: a shell or exec tool, or a browser / preview / screenshot tool. Reading its source is not reviewing it |

A close - a completion claim, or the block - with an edited file that nothing reviewed since its last change is the finding: the agent cannot feel that its last change was never reviewed; the hook can count it. Whether the review compared the result with its source, point by point, is the agent's part, written in `Found`.

The level is an aspiration level in Simon's sense: the bar a search stops at (Simon, 1956). Held at the property rather than at the first acceptable version, and checked by reviewing the result rather than by another pass in the head - without an external check, another pass is not evidence the result got better (Huang et al., 2023).

**Where the neighbours take over.** How many passes is persistence's call: the same `Found` after a pass is its signal. A part the request states and the result lacks is coverage's. Whether a claim is verified is epistemic's (`Reviewed` may cite its `Verified by`). A raise that adds scope is executive's. A stop on a feeling is termination's.

## How it's built

- **Skill** (`skills/aspiration-self-monitoring/SKILL.md`) - the protocol: name the objective as a property before the work, find the source it comes from and get it, review the result after the last change in its medium, compare it point by point, and close true: `meets` only when the comparison shows it, `defect` when a point still does not hold, `unverified` when the source was out of reach, `blocked` when nothing here can review the result. Plus the `[ASPIRATION CHECK]` block (a markdown list, not a fenced code block).
- **Hook adapters** - three layers:

| Layer | Claude Code / Codex | Cursor |
|-------|---------------------|--------|
| **The skill** in context | `SessionStart` (startup, `/clear`, compaction; a resume only when it never had it) → the skill's text, `hooks/aspir-inject.js` | `sessionStart` → `additional_context`, with the load message |
| **Load** the discipline | `UserPromptSubmit`: first turn, then every 10th, and after a resume or compaction; carries the retrospective | `sessionStart` → `additional_context` |
| **Record** edits and reviews | `PostToolUse`: the tool's name, the path it names and a command's text, never its output | `postToolUse` |
| **Close** - scan the final message for a claim and the block | `Stop` reads `last_assistant_message` with the turn's counts | `afterAgentResponse` scans `text`; `stop` acts on it |

Block rules:

- a close (a completion claim, or the block) with an edited file nobody reviewed since its last change is the finding, unless `Remainder` is `blocked`
- a completion claim after edits this turn, with no block, is the finding
- `Criterion`, `Reviewed` and `Found` are required; `none` is empty
- a close short of the objective - `defect`, `unverified` or `blocked` - is asked what the agent has not looked at that could still move the result closer: in the project (its files, its own tools and instructions), in how the result is used, and in the source past the first pages found; with how many of the project's files the session read. If one could, look and compare again; if none could, the close stands, with what was tried in `Reviewed`. It is a question about where to look, not "try harder": without new information another pass is not evidence (Huang et al., 2023), and explicit questions answered apart do better than a re-read (Dhuliawala et al., 2023)
- `Remainder` is `meets`, `defect`, `unverified` or `blocked`; `defect` at the close is reported to the owner as it stands. `meets` is the stop: a better version the agent can only imagine is not a reason for another pass, and a preference the owner might want is offered in the handoff, not decided

The claim scanner (`lib/lexicon.js`) is sentence-anchored and narrow. "This is done." is a claim. "It is done in the constructor" is a description. "Status: done" inside another plugin's block is not a claim, and neither is "the user said this is done". Fenced code, inline code, quoted text and quoted lines are stripped first. A claim in a turn with no edits is not judged: nothing was delivered.

The hook never decides whether the page, the report, the image or the patch is good. That judgment stays with the agent, against the property it named.

Plain Node, no dependencies, **fail silent**: a hook error never blocks a prompt or a stop.

## The gate - non-blocking by default, strict on request

**Default:** findings go to the opt-in log and into the next prompt as one line (Claude Code, Codex). The turn ends normally. The user sees one notice line (`systemMessage`); `ASPMON_NOTICE=0` turns that off.

**Strict** (`ASPMON_STRICT=1`): the gate blocks once. Claude Code exits 2. Cursor returns a `followup_message` once (`loop_limit: 1`).

Run non-strict first. A forced extra turn is worth its cost only if the retrospective is not enough.

## What the agent sees

When a turn ends on "This is done." after a change nobody reviewed, the next prompt opens with:

```
[aspiration self-monitoring] Your previous turn closed on a result it called
good enough: 1 edited file not reviewed since the last change - read, view,
run or render it the way the project documents - one refused command says that
command is not allowed, not that nothing runs; a completion claim ("This is
done") with no [ASPIRATION CHECK] block. Review the result the way it will be
used, then write the [ASPIRATION CHECK] as a markdown list - Criterion,
Reviewed, Found, Remainder (meets | defect | unverified | blocked). Stop when
the review finds the criterion met, or say what blocks the review. If you do
not know what these markers ask for, load the aspiration-self-monitoring skill
("Core Protocol").
```

## What the user sees

On Claude Code and Codex, a finding shows one line in the transcript. The block, when the agent writes it, is the rest.

## Example prompts

Prompts where the discipline is due - a change whose result can be reviewed against what was asked:

- "Add a `total` column to the weekly report; the owner reads the output as it comes out of the terminal."
- "Make the pricing page work on a phone - the buttons keep falling off the screen."
- "The low-poly pine should read as a pine at the distance the shot uses."
- "Rewrite the install guide so a new user can follow it without asking anyone."

And one where it stays quiet: "What does Herbert Simon mean by an aspiration level?" - nothing is delivered, so nothing is judged.

## When a finding is wrong

- **A review it did not count.** A tool whose name is not a read, shell, exec, browser, preview or screenshot tool is not seen as a review. Say so in `Reviewed`; the retrospective is one line, and the next close after a counted review clears it.
- **No way to review here.** No display, no renderer, no way to play the audio, a service out of reach: write `Remainder: blocked` and name the limit in `Reviewed`. The edited files are not judged then.
- **A run that reviewed nothing.** Any run counts as reviewing every edited code file, and any render every edited file. That errs toward silence; `Reviewed` is where the agent says which run was the review.
- **An edit through the shell.** `sed -i` or a heredoc counts as a run, not an edit. That errs toward silence too.
- **A claim that was not a close.** The scanner reads the start of a sentence; a claim-shaped description still fires. It is one line, not a block of the turn.

## What it does on your machine

The hooks are Node scripts in `hooks/`, `cursor/` and `lib/`, run by the host with `node`. They load only Node's `fs`, `os` and `path`, make no network call and start no process; nothing leaves the machine.

- **Reads:** the JSON event the host sends on stdin - the session id, a tool's name, the path its input names, a shell command's text (to see which edited files it names), the assistant's final message - measured and never executed. It also reads the plugin's own `skills/aspiration-self-monitoring/SKILL.md`, whose text it puts in context when a session starts. It never reads the user's prompt into a message, a tool's output, or any project file; no path or command reaches a message.
- **Writes:** one small state file per session in `<temp>/3dgiordano-agent-plugins/`, named `aspmon_…`, kept for a resume and swept after seven days; only with `ASPMON_LOG` set, the debug log below.
- **Says:** fixed text, with counts and, from the agent's own final message, the claim phrase (≤80 characters) and a malformed `Remainder` value (≤40).
- **`evals/`** holds the cases `claude plugin eval` runs: prompts, graders and a small fixture project. The plugin never runs them.

The same rules for every plugin in the collection, and how to report a hook that breaks them, are in [SECURITY.md](https://github.com/3dgiordano/agent-plugins/blob/main/SECURITY.md).

## Debug log (opt-in, off by default)

```
# PowerShell:  $env:ASPMON_LOG = "1"      $env:ASPMON_STRICT = "1"
# bash:        export ASPMON_LOG=1        export ASPMON_STRICT=1
```

JSONL under `<project>/.claude/logs/aspiration-self-monitoring.jsonl` (Claude Code) or `<project>/.cursor/logs/…` (Cursor); override with `ASPMON_LOG_HOST=claude|cursor`. Rotates at ~256 KB to a single `.1` backup.

| Event | Fields | Meaning |
|-------|--------|---------|
| `prompt` | `turn`, `load`, `retrospective` | cadence and a parked finding |
| `observe` | `kind` (`edit`, `read`, `run` or `render`), `unreviewed` | a tool call that counts |
| `session_start` | - | once per Cursor session |
| `stop` | `claims`, `blocks`, `remainder`, `edits`, `unreviewed`, `violations`, `strict`, `blocked` | the final message (Claude Code); on Cursor, the stop adapter's `status`, `violations`, `blocked` |
| `response` | as `stop`, without `blocked` | Cursor's final message |
| `subagent_stop` | as `stop`, plus `agent` | measured only: never blocks, never parks |

```
node scripts/calibrate.js <project dirs>
# how often does a close come with an edited file nobody reviewed?
```

## What was measured

The skill compares the result with a source the agent did not write because the first text - hold the result against the objective - let false closes through: `meets` on a result the check fails. The cases put the source outside the workspace: the flag of Nepal drawn from memory, a QR-bill guide and builder to a standard that changed in November 2025, and a report on this week's data. The cases and their checks are by the plugin's author (bench/aspiration-self-monitoring/).

| Host, model, dates | Skill text, and how it reached the agent | False `meets`, first text | False `meets`, compared text | Compared text, check passed |
|---|---|---|---|---|
| Cursor, Grok 4.7 High, 2026-10-01/03, 1-3 runs per arm | an earlier draft, without the rule on refused commands; the agent read it in 10 of 18 runs | 5 of 5 runs that failed the check | 0 of 9 | Nepal and the code case passed; the guide closed `unverified` |
| Claude Code, Sonnet 5, 2026-10-03, `ASPMON_STRICT=1`, 3-4 runs per arm | the full text, not injected: loaded in 1 of 20 runs, so the description and the hook messages | 1 of 9 (the guide: "meets for the rules I read", one rule missing) | 0 of 10 | report 3/3, guide 3/3, Nepal 0/4 |
| Claude Code, Sonnet 5, 2026-10-03, `ASPMON_STRICT=1`, 3 runs per case | this text, in context from the session's start in every run | (as above) | 1 of 9 (the guide: one rule's source section never read) | report 3/3, guide 2/3, Nepal 0/3 |
| Claude Code, Sonnet 5, 2026-10-04, `ASPMON_STRICT=1`, 3 runs per case | this text plus the question asked at every close short of the objective | (not run) | 1 of 6 (the guide again: the all-zero reference rule and the 2.2 rule not stated, closed `meets`) | report 3/3, guide 2/3: no regression from the question |

Before those series, a one-run Claude probe of the earlier draft on the guide closed `meets` with one rule missing that it never read, as the first text did. That is the false `meets` that is left on both Claude texts: the guide's QR-reference rule is stated as it was before 2.3, and the close says it matches the official PDF, whose section on that rule the agent never opened. Inside a close with several criteria, two Nepal runs on the uncut text still wrote `meets` on one criterion without the source behind it, while the close as a whole said defect.

**Whether it tries: the flag of Nepal on Claude Code** (Sonnet 5, 2026-10-04, `ASPMON_STRICT=1`, 3 runs per row, 6 in the last). The objective is a hand-drawn SVG that matches the official construction (97% of the pixels, and the sun's and the moon's rays); the workspace has the print shop's renderer, documented in its README, and the construction is on the web. Every row ran after the runner's fixes to what the agent sees (shell commands refused by name, Git Bash `/tmp` paths readable; see the CHANGELOG). In two runs of the last row the preview went to the `/tmp` every run then shared, and the audit set them aside; they are graded here by the same check, and the last three runs had a `/tmp` of their own:

| Arm | Passed | Match | Rendered its drawing | False `meets` | Close |
|---|---|---|---|---|---|
| No plugin | 0/3 | 0.53, 0.79, 0.93 | 0/3 | - | no check written |
| Skill in context, no question at a short close | 1/3 | 0.94, 0.99, 0.95 | 1/3 | 0 | unverified, blocked (the pass, understated), unverified |
| Skill and the question at a short close | 1/6 | 0.99, 0.99, 0.99, 0.82; two drew nothing | 4/6 | 0 | the pass closed `meets`; the others defect, unverified or blocked |

Without the plugin the agent goes to the web, draws once and hands the file over: it does not open the project, render or compare. With the skill it researches the source and compares numbers with it, and closes honestly. The question - asked at every close short of the objective - came in 5 of the 6 runs and was followed by a new look in 4 of them: the project's files and tools opened, a render viewed, the drawing edited and rendered again; one run passed right after it, one came within the match but drew the moon's rays wrong (as did a run the question never reached). Two runs never drew: they would not draw without the full construction, which the agent could not fetch whole (a summary, or a refusal of the constitution's text), and closed `blocked` asking for it. n is small; what these rows show is the try and the honest close, not a rate.

## Limits

- **Subagents** do not get the skill's text: a subagent's close is measured, never gated.
- **Silence.** An agent that ships the first version and never says it is done writes no claim and gets no nudge.
- **The review is counted, not judged.** The hook knows the result was read, run or rendered after the edit - not that it was reviewed on the right input, nor compared with a source the agent did not write. The skill asks for both; the hook cannot check them.
- **Audio and video** have no review tool on most hosts: a run of a tool that plays or analyses them counts; otherwise the close is `blocked`, with the limit named.
- **Cursor headless** (`cursor-agent -p`) fires no `afterAgentResponse` or `stop`, so the close scan runs in the IDE only.

## References

Inspiration for the design; none of these tested this plugin. The map is in [docs/RESEARCH.md](https://github.com/3dgiordano/agent-plugins/blob/main/docs/RESEARCH.md).

- Simon, H. A. (1956). Rational choice and the structure of the environment. Psychological Review, 63(2), 129–138. [doi:10.1037/h0042769](https://doi.org/10.1037/h0042769). An aspiration level is a bar the search stops at.
- Huang et al. (2023). Large Language Models Cannot Self-Correct Reasoning Yet. [arXiv:2310.01798](https://arxiv.org/abs/2310.01798). Without an external check, another pass is not evidence that the result got better.
- Dhuliawala et al. (2023). Chain-of-Verification Reduces Hallucination in Large Language Models. [arXiv:2309.11495](https://arxiv.org/abs/2309.11495). Explicit questions about an answer, answered apart, correct it where a re-read does not: a close short of the objective is asked where the agent has not looked.
- Olausson et al. (2023). Is Self-Repair a Silver Bullet for Code Generation? [arXiv:2306.09896](https://arxiv.org/abs/2306.09896). Repair is bounded by the quality of the feedback: the review has to be on the input the task is about.
- Cemri et al. (2025). Why Do Multi-Agent LLM Systems Fail? [arXiv:2503.13657](https://arxiv.org/abs/2503.13657). Premature termination and missing or incomplete verification of the final output are one of the three failure categories.

## Layout

```
.plugin/plugin.json                # Agent Plugins manifest (portable core: skill only; not at the root - see the repository README)
.claude-plugin/plugin.json         # Claude Code manifest
.codex-plugin/plugin.json          # Codex manifest (skills: ./skills, hooks: ./hooks/hooks.json)
.cursor-plugin/plugin.json         # Cursor manifest (skills: ./skills, hooks: ./cursor/hooks.json)
assets/                            # plugin mark (Cursor marketplace logo; shown at the top of this README)
skills/aspiration-self-monitoring/SKILL.md
hooks/hooks.json                   # Claude Code + Codex: SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd, SubagentStop
hooks/aspir-prompt.js              # load, retrospective, the turn's count starts
hooks/aspir-observe.js             # edits and reviews
hooks/aspir-stop.js                # the close
hooks/aspir-session-start.js       # reload after a resume or compaction
hooks/aspir-inject.js              # the skill's text at session start, after /clear or compaction
hooks/aspir-session-end.js         # sweeps aged state
cursor/hooks.json                  # Cursor: sessionStart, postToolUse, afterAgentResponse, stop
cursor/aspir-session-start.js
cursor/aspir-observe-cursor.js
cursor/aspir-response-cursor.js
cursor/aspir-stop-cursor.js
lib/signals.js                     # one tool call -> edit, read, run, render or nothing; files not reviewed since their change
lib/lexicon.js                     # the claim, the block and its rules
lib/messages.js                    # texts shared by both adapters
lib/state.js                       # per-session state (<temp>/3dgiordano-agent-plugins/); lockfile-guarded update(); remove()/sweep()
lib/host.js                        # cwdOf(), the notice and output envelopes (identical in every plugin)
lib/log.js                         # opt-in logger (per-plugin copy; plugins are self-contained)
```

On any other Agent Skills / Agent Plugins host the skill loads on its own: the protocol works without hooks; only the record of edits and reviews is host-specific.

Install instructions are in the [repository README](https://github.com/3dgiordano/agent-plugins/blob/main/README.md).
