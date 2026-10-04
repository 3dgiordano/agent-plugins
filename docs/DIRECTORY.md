# Claude plugin directory: compliance and release checklist

What it takes to list these plugins in Anthropic's plugin directory, where
this repository stands against each rule, and the checklist every release
runs through so a release does not drift out of compliance.

Reviewed on 2026-09-28 against:

- [Publish to the directory](https://claude.com/docs/directory/publish)
- [Plugin pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist)
- [Submit your plugin](https://claude.com/docs/plugins/submit)
- [Plugin feature support across platforms](https://claude.com/docs/plugins/platform-support)
- [Anthropic Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy) (effective 2026-04-15)
- [Anthropic Software Directory Terms](https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms) (2026-03-16)

These pages change. Re-read them before each submission and at least once a
quarter, and update this file and `scripts/directory-check.js` when a rule
moves.

## How the directory sees this repository

- **Eight submissions, not one.** The portal takes one plugin folder per
  submission. Each plugin is submitted as **Plugin bundle**, repository
  `3dgiordano/agent-plugins`, plugin path `plugins/<name>`. The organization
  that submits a folder first owns its listing, so submit from the account
  that should own it long term. At most 10 submissions per 24 hours.
- **Users get only the plugin folder.** Everything a hook runs is inside
  `plugins/<name>/` already (`hooks/`, `lib/`). The root `SECURITY.md`,
  `LICENSE` and `docs/` do not ship; the plugin README and `plugin.json`
  (`license`, `privacyPolicyUrl`, `supportUrl`) carry what the listing needs.
- **Every commit on the tracked branch is a new version**, scanned, and -
  because of the holds below - read by a reviewer before it goes live.
  Track a release ref, not `main` (see *Decisions*, 4).
- **Surfaces.** In claude.ai chat hooks are ignored: only the skill loads.
  Cowork and Claude Code load skills and hooks. The hooks need `node` on the
  machine that runs them. Test each surface before submitting.

## Automated checks (`scripts/directory-check.js`)

The script mirrors every row of the pre-submission checklist that can be
checked offline, with the result the portal gives it (block, hold, warn), and
the Directory Policy items a script can approximate. CI runs it on every push
and pull request; it fails on any block and on any hold not recorded, with its
reason, in `scripts/directory-holds.json`. `scripts/test.js` proves it still
catches each rule on a deliberately broken plugin.

State on 2026-10-04: **0 blocking findings** on all ten plugins;
`claude plugin validate` passes on each plugin and on the marketplace.

### Holds we expect, and accept

A hold is not a rejection: a reviewer reads the version before it goes live.

| Hold | Where | Why it is there |
| --- | --- | --- |
| Scripts the validator couldn't follow | every `hooks/hooks.json` entry | The hooks are Node.js files that `require` `../lib/*.js`, in a plugin that is a subfolder of the repository. The validator follows only plain shell scripts there. Goes away only with each plugin at the root of its own repository (*Decisions*, 1). |
| Uses a credential from the user's machine | `progress-self-monitoring/evals/*/files/scripts/publish.js` | Eval fixture: a sample project's release script reads `NPM_TOKEN`. No hook runs it, no eval asks the agent to. `claude plugin eval` only reads `evals/` inside the plugin folder, so it ships. |
| (possible) Uses a credential from the user's machine | `integrity-self-monitoring` README and `lib/code.js` | The text `process.env.API_KEY \|\| 'dev-key'` names a shape the hook detects; nothing reads `API_KEY`. |
| (possible) Name may be confused with an existing listing | all ten names | Names built only from generic words (`executive`, `self`, `monitoring`) are held; the portal decides (*Decisions*, 2). |

Fixed on 2026-09-28: each README's *Layout* block wrote `assets/logo.svg`
inside a code block, which holds a version ("don't write bundled image paths
in backticks or a code block").

## Software Directory Policy

| § | Rule (short) | Status |
| --- | --- | --- |
| 1.A | Usage Policy | Meets. |
| 1.B | No circumventing guardrails, system instructions or sandbox | Meets. Hooks add context and a one-line notice; they never alter output. The four strict gates are opt-in env vars and block a stop at most once per turn. |
| 1.C | Privacy first | Meets: nothing leaves the machine; no network calls, no child processes (SECURITY.md, checked by `scripts/test.js`). |
| 1.D | Only necessary data; no extraneous conversation data, **including for logging** | **Risk.** The opt-in debug logs (`*_LOG`) and the opt-in coverage misread log store clipped phrases of the agent's own messages on the user's disk. Off by default, local, documented, but the rule names logging (*Decisions*, 3). |
| 1.E | No IP infringement | Meets: own code, Apache-2.0; research is cited, not copied. |
| 1.F | Never query or extract Claude memory, chat history, summaries or user files | Meets, disclosed: hooks read only the event the host sends (no `transcript_path` read anywhere). Four read a project file and emit only counts and metadata: progress (`.agent/progress.md`), integrity (the file an edit just wrote), executive (mtimes only), hygiene (the JavaScript and TypeScript files near the root at session start and a code file the agent reads or edits, kept as exported names, line numbers and hashes; it emits a path, lines and a count). |
| 2.A-B | Narrow, exact descriptions | **Risk, low.** Skill descriptions end with long trigger lists (e.g. "debugging, root cause, ... verify, confirm"); a reviewer may read them as broader than the skill. |
| 2.C | No confusion with other listings | See name hold above. |
| 2.D-E | No coercing calls to external software; no interfering with tools | Meets: the prompt hooks point at the plugin's own skill only; no hook blocks a tool call. Note: with all ten installed, each prompt carries up to ten reminders. |
| 2.F | No behavioural instructions pulled from external sources | Meets: every message is static text in `lib/messages.js`; session values are counts, paths and the agent's own short phrases (SECURITY.md, *Scope notes*). |
| 2.G | No hidden, obfuscated or encoded instructions | Meets: readable unminified source; the check fails on invisible/bidi characters, long encoded runs and over-long lines. |
| 3.A | Privacy policy link | Partial: `privacyPolicyUrl` points at `SECURITY.md`, which states the data behaviour but is not titled a privacy policy (*Decisions*, 5). |
| 3.B | Verified contact and support channel | Meets: `supportUrl` (issues), private vulnerability reporting (SECURITY.md), the portal's contact email. |
| 3.C | Document functionality, purpose **and troubleshooting** | **Gap** in 7 of 10 READMEs: no troubleshooting section (coverage, integrity and aspiration have one). Flagged by the check as a warning. |
| 3.D | Test accounts with sample data | N/A: no service, no account. |
| 3.E | **At least three working prompt examples** | **Gap** in 9 of 10 READMEs (aspiration lists its prompts). The eval prompts under `evals/` work but those READMEs list none. Flagged as a warning. |
| 3.F | Own the endpoints and domains it reaches | N/A: reaches none. |
| 3.G | Maintain, fix in reasonable time | Meets: SECURITY.md, 7-day acknowledgement. |
| 3.H | Agree to the Terms | At submission (the four acknowledgements). |
| 4 | Money, AI image/video/audio generation, ads | None apply. |
| 5 | MCP servers | N/A: no MCP server. |

## Software Directory Terms (the submitter's obligations)

| Obligation | Status |
| --- | --- |
| Rights to the software; complies with law and the Policy; information accurate and current | Own code under Apache-2.0. Keep `plugin.json` descriptions and READMEs true to the code (`scripts/samples.js` already checks the message samples). |
| Privacy policy if user data is collected | No data is collected by the developer; state that explicitly (*Decisions*, 5). |
| Licence to Anthropic for names, descriptions, logos | Our own SVG marks; nothing third-party in `assets/`. |
| Security standards and a vulnerability-report channel, investigated with reasonable care | SECURITY.md; each plugin README links it. |
| No suggested partnership or endorsement by Anthropic; Trademark Guidelines | Meets: "Claude Code" appears only as a host name; no Anthropic marks; no "official". Keep it that way. |
| Indemnification; Anthropic may remove a listing | Accepted at submission. |

## Decisions for the maintainer

1. **Monorepo or one repository per plugin.** In this repository every
   version of every plugin is held for a reviewer (Node hooks in a
   subfolder), so no release goes live on its own. Default: stay in the
   monorepo and accept the hold. Alternative: publish a per-plugin mirror
   repository (plugin at the root) from CI, and submit those.
2. **Names.** Keep `*-self-monitoring` (possible "name may be confused"
   hold) or add a distinctive project prefix before the first submission -
   the name cannot change cheaply afterwards. Default: keep, and let the
   portal's Validate answer.
3. **Opt-in logs vs. Policy 1.D.** Default: keep them off by default and
   state in each README that they never leave the machine; if a reviewer
   objects, drop the text fields and keep only counts.
4. **Tracked ref.** Default: submit with a tag the release moves (for
   example `directory`), so work on `main` is not scanned and held as a
   version.
5. **Privacy policy.** Default: add `PRIVACY.md` (no collection, what stays
   on disk, for how long, how to delete it) and point every
   `privacyPolicyUrl` at it.
6. **README gaps (3.C, 3.E).** Add to each plugin README an *Examples*
   section with three prompts that make the plugin act (drawn from its
   `evals/*/prompt.md`) and a *Troubleshooting* section.

## Every release

Automated (CI, on every push and pull request):

- [ ] `node scripts/directory-check.js` - no block, no unaccepted hold
- [ ] `node scripts/test.js`, `node scripts/version.js --check`,
      `node scripts/samples.js --check`

By hand, before moving the tracked ref:

- [ ] `node scripts/directory-check.js --base <last release tag>` - no
      `version-not-raised`: every plugin whose folder changed has a higher
      `version` (the directory and Claude Code use it to ship updates)
- [ ] `claude plugin validate ./plugins/<name>` for each changed plugin,
      and `claude plugin validate .` for the marketplace
- [ ] The plugin README still describes everything the plugin reads,
      writes, runs or sends (the security scan compares behaviour to it); if
      a hook's input, output or log changed, SECURITY.md too
- [ ] No new network call, child process, dependency, `package.json`,
      lockfile, `.npmrc` or binary in a plugin folder; if one is unavoidable,
      disclose it and expect a hold
- [ ] Skill descriptions still match what the skill does (Policy 2.A-B)
- [ ] Load the changed plugin once in Claude Code and once in Cowork; in
      chat only the skill loads
- [ ] `claude plugin eval` on the changed plugin (costs model calls; not in
      CI by design)
- [ ] After the tag moves: the portal's **Versions** tab shows the version
      scanned, passed or held; answer any hold

Before a first submission, also: the repository is public; the account is on
Pro, Max, Team or Enterprise with the right role; GitHub is connected in
that Claude organization; Validate in the portal shows no **Blocking**
finding; the *Data handling* answers below match the code.

### Data handling answers (portal draft)

- Reads or stores personal data: no. Per-session state (counts, file paths,
  short phrases of the agent's own messages) in
  `<os-temp-dir>/3dgiordano-agent-plugins/`, deleted after 7 days; opt-in
  debug logs under the project's `.claude/logs/`.
- Sends data to services other than declared connectors: no; no network
  access at all.
- Retention: state files 7 days; opt-in logs until the user deletes them
  (rotated at about 256 KB).
- Intended for people under 18: no.
