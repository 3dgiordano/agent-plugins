'use strict';
/*
 * Where the project is, as seen from a hook process.
 *
 * A hook runs with the plugin's install directory as its working directory,
 * so process.cwd() is never the answer. Claude Code sends `cwd` in every
 * event and exports CLAUDE_PROJECT_DIR; Cursor sends `workspace_roots` and
 * exports CURSOR_PROJECT_DIR. When none of those is present the caller gets
 * null and must do nothing rather than guess.
 *
 * (Deliberately a per-plugin copy: each plugin installs on its own.)
 */

function cwdOf(data) {
  if (data && typeof data.cwd === 'string' && data.cwd) return data.cwd;
  if (data && Array.isArray(data.workspace_roots) && typeof data.workspace_roots[0] === 'string' && data.workspace_roots[0]) return data.workspace_roots[0];
  return process.env.CLAUDE_PROJECT_DIR || process.env.CURSOR_PROJECT_DIR || null;
}

module.exports = { cwdOf };
