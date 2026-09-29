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
/*
 * A notice is for the person, not the model: one line the host shows in the
 * transcript and does not add to the model's context - top-level
 * `systemMessage`. Without it the hooks are invisible to the user; the only
 * trace of a finding is the block the agent writes, or does not.
 *
 * It rides beside the context, never instead of it, and only on a finding -
 * never on the load message or a cadence reminder, which carry no news.
 * Off with the plugin's *_NOTICE=0 (`notices()` in lib/log.js).
 */
const NOTICE_MAX = 280;

// The part of a finding a person reads: up to the first " - " outside double
// quotes. After it comes the instruction written for the agent.
function finding(v) {
  let q = false;
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '"') q = !q;
    else if (!q && v.startsWith(' - ', i)) return v.slice(0, i);
  }
  return v;
}

function notice(label, findings, tail) {
  let s = `[${label}] ` + findings.map(finding).join('; ');
  if (s.length > NOTICE_MAX) s = s.slice(0, NOTICE_MAX - 3) + '...';
  return tail ? `${s} - ${tail}` : s;
}

// The stdout envelope for `text` on `event` (a hook event name as the host
// spells it), and for `note`, the notice. Either may be empty; callers write
// nothing when both are.
function context(event, text, note) {
  const out = {};
  if (text) out.hookSpecificOutput = { hookEventName: event, additionalContext: text };
  if (note) out.systemMessage = note;
  return JSON.stringify(out);
}

/*
 * The part of a prompt the user wrote. Text pasted into the message arrives
 * wrapped in <pasted_content id="…"> … </pasted_content id="…"> (Claude Code
 * desktop): a transcript, a log, another agent's reply. Its bullets are not
 * the request's parts and its "next session" is not the user's. Measured
 * 2026-09-25: a pasted reply with a twelve-line list read as "the request
 * enumerates 12 parts" and as a request that spans sessions. An unclosed
 * block runs to the end of the prompt.
 */
function userText(prompt) {
  if (typeof prompt !== 'string') return '';
  return prompt
    .replace(/<pasted_content\b[^>]*>[\s\S]*?<\/pasted_content\b[^>]*>/gi, ' ')
    .replace(/<pasted_content\b[^>]*>[\s\S]*$/i, ' ');
}

/*
 * A prompt nobody typed. Claude Code hands a background task's completion to
 * the model as a user turn - UserPromptSubmit fires with the prompt
 * `<task-notification>...</task-notification>`. Counted as turns, those
 * prompts reset the per-turn counters mid-task, fire a once-per-turn
 * pre-close again inside the same turn, bring the load back on the cadence,
 * and spend a retrospective on a notification. A prompt that is nothing
 * but such blocks is not a turn, and the prompt hooks leave the session alone.
 *
 * The same holds for another agent's message - a subagent handing back its
 * report, a teammate writing in. Claude Code delivers it as a user turn that
 * opens `Another Claude session sent a message:` and wraps the text in
 * `<agent-message from="...">`, then appends its own paragraph about who
 * sent it, so "nothing but the blocks" cannot be the test here: the opening
 * is. Counted as a turn, a report's bullet list became the parts of the
 * user's request.
 */
const AGENT_MESSAGE_RE = /^\s*(?:Another Claude session sent a message:\s*)?<agent-message\b/;

function notification(prompt) {
  if (typeof prompt !== 'string') return false;
  if (AGENT_MESSAGE_RE.test(prompt)) return true;
  if (!/<task-notification>/.test(prompt)) return false;
  return prompt.replace(/<task-notification>[\s\S]*?<\/task-notification>/g, '').trim() === '';
}

/*
 * The skill's own text, for the hooks that put it in context when a session
 * or a subagent starts: SKILL.md without its frontmatter, under one line that
 * says it is loaded. The agent does not have to reach for a skill it may never
 * reach for, and a subagent without the Skill tool gets it too.
 *
 * INJECT_MAX is under the smallest ceiling of the hosts that take it. Claude
 * Code keeps 10,000 characters of a hook's context and moves the rest to a
 * file, leaving a preview; Codex keeps about 2,500 tokens unless the handler
 * sets additionalContextLimit, which the inject handlers in hooks/hooks.json
 * do. Over the ceiling the hook sends nothing: a preview of a skill is a
 * skill with its rules cut off.
 */
const INJECT_MAX = 9800;

function skillText(root, plugin) {
  const name = `${plugin}-self-monitoring`;
  let md;
  try { md = require('fs').readFileSync(require('path').join(root, 'skills', name, 'SKILL.md'), 'utf8'); } catch (_) { return ''; }
  const fm = md.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  const body = (fm ? md.slice(fm[0].length) : md).trim();
  if (!body) return '';
  const text = `[${plugin} self-monitoring] The ${name} skill is loaded for this session. Its text:\n\n${body}`;
  return text.length <= INJECT_MAX ? text : '';
}

module.exports = { cwdOf, context, notice, finding, userText, notification, skillText, INJECT_MAX };
