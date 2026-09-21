'use strict';
/*
 * The host, as seen from a hook process: where the project is, and how text
 * reaches the model.
 *
 * A hook runs with the plugin's install directory as its working directory,
 * so process.cwd() is never the answer. Claude Code and Codex send `cwd` in
 * every event and Claude Code exports CLAUDE_PROJECT_DIR; Cursor sends
 * `workspace_roots` and exports CURSOR_PROJECT_DIR. When none of those is
 * present the caller gets null and must do nothing rather than guess.
 *
 * Text for the model goes out as the one envelope both hosts that run hooks/
 * accept on the events that inject context (SessionStart, UserPromptSubmit,
 * PostToolUse): `hookSpecificOutput.additionalContext`. Claude Code also adds
 * plain stdout as context; Codex reads stdout that begins with `[` as JSON,
 * fails to parse it and drops it - and every message here begins with
 * `[<plugin> self-monitoring]`. So nothing is written plain.
 *
 * (Deliberately a per-plugin copy: each plugin installs on its own.)
 */

function cwdOf(data) {
  if (data && typeof data.cwd === 'string' && data.cwd) return data.cwd;
  if (data && Array.isArray(data.workspace_roots) && typeof data.workspace_roots[0] === 'string' && data.workspace_roots[0]) return data.workspace_roots[0];
  return process.env.CLAUDE_PROJECT_DIR || process.env.CURSOR_PROJECT_DIR || null;
}

// The stdout envelope for `text` on `event` (a hook event name as the host
// spells it). Callers write nothing when they have nothing to say.
function context(event, text) {
  return JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text } });
}

module.exports = { cwdOf, context };
