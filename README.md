# agent-plugins

Reusable plugins for coding agents, by [3dgiordano](https://github.com/3dgiordano).

Each plugin is built around a shared, host-neutral core — an
[Agent Skill](https://agentskills.io) (`skills/<name>/SKILL.md`) — plus thin
per-host adapters for the parts that cannot be portable (hooks). One folder,
one install, on every host it supports:

| Host | How it loads the plugin |
|------|-------------------------|
| **Claude Code** | `.claude-plugin/plugin.json` + `hooks/hooks.json` — install from this repo as a marketplace |
| **Cursor** | `.cursor-plugin/plugin.json` + `cursor/hooks.json` — install from this repo as a marketplace |
| **Any [Agent Plugins](https://agent-plugins.org) client** | root `plugin.json` — portable core (skill only; no hooks) |

## Plugins

| Plugin | What it does |
|--------|--------------|
| [executive-self-monitoring](plugins/executive-self-monitoring/) | Plan-anchored drift self-check: periodically nudges the agent to re-read the active plan/gate instead of drifting. Not a blocker. |

Each plugin folder has its own README with design notes, host differences and
debugging tips.

## Install

### Claude Code

Register this repo as a marketplace, then install the plugin from it. Works
from the `claude plugin` CLI or the interactive `/plugin` command in a session.

```
claude plugin marketplace add 3dgiordano/agent-plugins
claude plugin install executive-self-monitoring@3dgiordano-agent-plugins
```

```
/plugin marketplace add 3dgiordano/agent-plugins
/plugin install executive-self-monitoring@3dgiordano-agent-plugins
```

Enabling the plugin makes the skill available **and** auto-registers its hooks —
no manual `settings.json` edit, no per-project file copying.

Both commands accept `--scope <user|project|local>`:

| Scope | Written to | Applies to |
|-------|-----------|------------|
| `user` *(default)* | your global `~/.claude` config | you, in every project |
| `project` | the project's `.claude/settings.json` (git-tracked) | everyone who clones the repo |
| `local` | the project's `.claude/settings.local.json` (gitignored) | just you, just this project |

> If a project already has a hand-wired copy of a plugin's hook (in its own
> `.claude/hooks/` + `settings.json`), remove that wiring after installing the
> plugin — otherwise it fires twice.

### Cursor

Add this repo as a marketplace (Dashboard → Plugins → Add Marketplace → *Import
from Repo*, `3dgiordano/agent-plugins`), then install the plugin from
**Customize → Plugins**. Cursor loads the shared skill directly and registers the
`sessionStart` hook from `cursor/hooks.json`. Restart Cursor after installing.

### Local development

To test changes from a checkout instead of GitHub, register the folder path as
the marketplace (`claude plugin marketplace add /path/to/agent-plugins`) and
install with the same `<plugin>@3dgiordano-agent-plugins` name.

## Repository layout

```
.claude-plugin/marketplace.json   # Claude Code marketplace index
.cursor-plugin/marketplace.json   # Cursor marketplace index (same plugins)
plugins/<name>/
  plugin.json                     # Agent Plugins portable manifest
  .claude-plugin/plugin.json      # Claude Code manifest
  .cursor-plugin/plugin.json      # Cursor manifest (points hooks at cursor/)
  skills/<name>/SKILL.md          # shared core - the single source of truth
  hooks/                          # Claude Code hook adapter
  cursor/                         # Cursor hook adapter
  lib/                            # code shared by the adapters
```

## Adding a plugin

1. Create `plugins/<name>/` with the layout above (at minimum: root
   `plugin.json`, `.claude-plugin/plugin.json`, and a skill).
2. Register it in **both** `.claude-plugin/marketplace.json` and
   `.cursor-plugin/marketplace.json` (`source: "./plugins/<name>"`).
3. Keep host-specific behavior in the adapters; keep the skill host-neutral.
4. Set the version once for all manifests — never edit it by hand:

   ```
   node scripts/version.js <name> 1.4.0   # writes plugin.json + .claude-plugin + .cursor-plugin
   node scripts/version.js --check        # fails if any plugin has drifting versions
   ```

## License

[Apache-2.0](LICENSE)
