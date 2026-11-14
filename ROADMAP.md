# Roadmap

**Decision for Q4 2026 (owner, 2026-11-14): agent-plugins is a research-backed tool.** The work that comes first is being able to say, with evidence, what each plugin changes in an agent's work. Claude Code is the one fully supported host. New hosts and the directory listing wait for a trigger.

This page states what that decision means for the next quarter. What has been measured, with its numbers, is in [docs/EVIDENCE.md](docs/EVIDENCE.md); the protocol a confirmatory study follows is in [docs/STUDY-PROTOCOL.md](docs/STUDY-PROTOCOL.md).

## Hosts

| Host | Support | What that means |
| --- | --- | --- |
| Claude Code | **Full** | Every hook runs, including the close checks and the two default holds. Outcome runs on the bench (benchmark 1.2.0); the adapters are tested with host-shaped JSON, and the failed-command payload was recorded from the host (2026-11-14). |
| Cursor | **Measured, partial** | Outcome runs on the bench (benchmark 1.2.0). Headless Cursor never fires its close-time events, so the close checks and holds do not run there; the skill, the session-start text and the tool-time notices do. |
| Codex | **Probe only** | Login, a bare baseline and hooks firing were probed (2026-10-22). No outcome run, and some payloads are not verified (whether `apply_patch` names its file, whether hooks honour `timeout`). |
| Factory Droid | **Built for, not run** | Built from Droid's documentation; never run on Droid. |
| Other Agent Plugins clients | **Skill only** | The portable manifest carries the skill and no hooks. |

A host moves up a row when it has outcome runs on the bench, or recorded payloads for what its adapter reads.

## Plugins, by what benchmark 1.2.0 shows

One plugin per run, n=3 per case and arm, release 0.20.0 versions; a development set, since three plugins were revised on these cases ([docs/EVIDENCE.md](docs/EVIDENCE.md)).

| Tier | Plugins | Benchmark 1.2.0 |
| --- | --- | --- |
| Separates on Claude Code | handoff, hygiene | 0/3 -> 3/3 on Haiku, Sonnet and Opus 5.5; on Cursor, hygiene 0/3 -> 3/3 on all three models and handoff a gain on each |
| Separates on one Claude model | progress | Sonnet 5.5 1/3 -> 3/3; Haiku and Opus at ceiling; gains on Composer 2.5 and Grok 4.7 |
| Gains on non-Claude models only | coverage, epistemic, integrity, persistence | At ceiling on all three Claude models; from none passing to all passing on both Grok models; epistemic reversed on Composer 2.5 (2/3 -> 1/3) |
| Not measured on Claude in this session | executive | Its Claude runs were invalidated by a code change; on Cursor, 0/3 -> 3/3 on Composer 2.5 and Grok 4.6, ceiling on Grok 4.7 |
| No outcome gain measured | termination, aspiration | Same with and without the plugin on all six models |

A plugin's tier changes only with a new measurement, never with a change of wording.

## This quarter

Work that spends no model usage comes first, because measurement capacity is the binding limit:

1. **The bench session.** Done on 2026-11-14: benchmark 1.2.0 is closed as the record of release 0.20.0, executive's Claude cells recorded as not scored, and `scripts/bench-report.js` only reads a session. A session is voided only by a change to what the agent receives, not by a version or metadata change.
2. **Public claims.** The README figure says it is a development-set score, with intervals, next to the figure.
3. **CI.** `bench-check.js` in CI, a real one-version-step check against the previous tag, and the host-parity gate tightened.
4. **The ledger.** Fold `.agent/progress.md` into a handful of themes, each with a decision or a default.
5. **Detector defects found in use** are fixed as they are found, each with a corpus line or a test.

When a subscription allows it:

6. **One study** that separates the fact a hook hands over, the skill text and the block, on cases written apart from the ones the plugins were tuned on, with an all-ten arm and its cost, pre-registered before the first run ([docs/STUDY-PROTOCOL.md](docs/STUDY-PROTOCOL.md)).
7. **Act on it.** Cut what the study does not support; make the blocks lighter where the fact alone carries the effect.

## Not this quarter

- New plugins, new blocks or new block fields.
- Changing a plugin's text, gate or grader on the canonical cases' results, or choosing wording from one to three probe runs.
- Parity work for Codex and Droid, and further directory preparation, until their triggers fire: the listing opens to the organization, or a host gets outcome runs.
