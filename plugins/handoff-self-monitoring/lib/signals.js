'use strict';
/*
 * The pre-close signal: the moment a turn starts to look finished, which is
 * when the final message is about to be written and the handoff format is
 * worth having in front of the agent - not thirty tool calls earlier, at the
 * prompt, where it gets buried.
 *
 * Two closing-shaped tool calls count:
 *   gate      - a test / build / lint runner whose output shows no failure
 *               (lib/fail.js decides; a red run is not a close)
 *   commit    - git commit / git push / a PR or MR being opened
 *
 * The nudge fires once per turn (since the user's last message), on the first
 * of them. Everything is scoped to the current turn.
 *
 * A third signal is the moment a close often turns: a search that found
 * nothing - a Glob or Grep with no match, an `ls` of an empty folder. What
 * was looked for and is not there is where an agent decides between making
 * the work with that gap named and stopping on it, so the line on what
 * blocked means arrives with the result, once per turn.
 */

const { outputText, looksFailed } = require('./fail.js');

const SHELL_TOOL_RE = /bash|shell|terminal|run_terminal_cmd|execute|command/i;

const COMMIT_RES = [
  /\bgit\s+(?:-\S+\s+)*(?:commit|push)\b/,
  /\bgh\s+pr\s+(?:create|merge)\b/,
  /\bglab\s+mr\s+create\b/,
];

const GATE_RES = [
  /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|build|lint|check|typecheck|verify)\b/,
  /\b(?:npx\s+|bunx\s+)?(?:jest|vitest|mocha|ava|tap|playwright\s+test|cypress\s+run|eslint|tsc)\b/,
  /\bpytest\b|\bpython3?\s+-m\s+(?:pytest|unittest)\b|\btox\b|\bnox\b/,
  /\bcargo\s+(?:test|build|check|clippy)\b/,
  /\bgo\s+(?:test|build|vet)\b/,
  /\b(?:mvn|mvnw)\s+(?:\S+\s+)*(?:test|verify|package|install)\b|\b(?:gradle|gradlew)\s+(?:\S+\s+)*(?:test|build|check)\b/,
  /\bdotnet\s+(?:test|build)\b/,
  /\bmake(?:\s+(?:test|check|build|all))?\s*(?:$|&&|;|\|)/,
  /\b(?:rspec|phpunit|mix\s+test|swift\s+test|dart\s+test|flutter\s+test)\b/,
  /\bnode\s+\S*test\S*(?:\.js|\.mjs|\.cjs)?\b/,
];

function freshTurn() {
  return { tools: 0, fired: { closing: false, empty: false, wrote: false } };
}

// A tool that writes a file: the turn made something, whatever it then asks.
const WRITE_TOOL_RE = /^(?:write|edit|multiedit|notebookedit|write_file|edit_file|search_replace|str_replace|apply_patch)$/i;

const SEARCH_TOOL_RE = /^(?:glob|grep|ls|list_dir|glob_file_search|file_search|grep_search)$/i;

// A search tool's result with no match in it: Claude Code's Glob and Grep
// answer {numFiles: 0, filenames: []}, other hosts a "No files found" line.
function searchFoundNothing(response) {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    if (response.content) return false;
    return response.numFiles === 0 || (Array.isArray(response.filenames) && !response.filenames.length);
  }
  return /^\s*no (?:files|matches|results) found\b/i.test(outputText(response));
}

// An `ls` whose output lists nothing but the folder and its parent: alone, or,
// in a longer command, a long listing (`total N`, then `.` and `..`) that ends
// there - an empty folder among the command's other output.
function lsFoundNothing(cmd, response) {
  const segs = segments(cmd);
  const runsLs = segs.filter((s) => /^\s*(?:cd\s+\S+\s*)?ls\b/.test(s.code));
  if (!runsLs.length) return false;
  const out = response && typeof response === 'object' && typeof response.stdout === 'string' ? response.stdout : outputText(response);
  const lines = String(out).split(/\r?\n/);
  if (segs.length === 1) return lines.filter((l) => l.trim()).every((l) => /^total \d+$/.test(l.trim()) || /\s\.{1,2}$/.test(l));
  for (let i = 0; i + 2 < lines.length; i++) {
    if (!/^total \d+$/.test(lines[i].trim()) || !/\s\.$/.test(lines[i + 1]) || !/\s\.\.$/.test(lines[i + 2])) continue;
    const next = lines[i + 3];
    if (next === undefined || !/^[-dlbcps][rwxsStT-]{9}/.test(next)) return true;
  }
  return false;
}

function commandOf(input) {
  if (!input || typeof input !== 'object') return '';
  for (const k of ['command', 'cmd', 'script', 'commandLine']) {
    if (typeof input[k] === 'string' && input[k]) return input[k];
  }
  return '';
}

/*
 * The shell the command runs, without the text it carries: a heredoc body,
 * a quoted string. "node -e \"...jest...\"" runs no suite, and a heredoc
 * that writes "surefire test" into a note runs no build - yet the gate
 * patterns found them there (2026-09-25 review).
 * Blanked character by character, so segment offsets stay the command's.
 */
function shellCode(cmd) {
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  return cmd
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g, (h) => h.replace(/\n[\s\S]*$/, (body) => blank(body)))
    // A quoted string may span lines: node -e "<a script>" usually does.
    .replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, blank);
}

/*
 * The segments of a command line, split on |, ||, &&, ; and newlines outside
 * quotes, each with its own text. The label is the segment the pattern
 * matched - "node --test", not the "head -20" or the `fail)"` a pipeline
 * ends on, which is what the last-segment label used to show.
 */
function segments(cmd) {
  const code = shellCode(cmd);
  const out = [];
  let from = 0;
  const re = /\|\|?|&&|;|\n/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    out.push({ code: code.slice(from, m.index), text: cmd.slice(from, m.index) });
    from = m.index + m[0].length;
  }
  out.push({ code: code.slice(from), text: cmd.slice(from) });
  return out.filter((s) => s.code.trim());
}

// A stable, short label for the log and the nudge: the first word or two of
// the segment that matched ("git commit", "npm test").
// A subshell's paren, VAR=value and an `env [-u NAME]` prefix are not the
// command: "(node scripts/test.js", "env -u" were labels before this.
function labelOf(segment) {
  const words = segment.trim().replace(/^[({\s]+/, '').split(/\s+/);
  let i = 0;
  for (;;) {
    if (/^\w+=/.test(words[i] || '')) i += 1;
    else if (words[i] === 'env') { i += 1; while (/^-/.test(words[i] || '')) i += /^-[uS]$/.test(words[i]) ? 2 : 1; }
    else break;
  }
  return words.slice(i, i + 2).join(' ').slice(0, 40);
}

/*
 * Record one tool call; return [{kind:'closing', what:'gate'|'commit', label}]
 * the first time a closing-shaped call is seen this turn, else [].
 */
function observe(turn, toolName, toolInput, toolResponse) {
  turn.tools += 1;
  if (WRITE_TOOL_RE.test(String(toolName || ''))) turn.fired.wrote = true;
  if (!turn.fired.empty) {
    const name = String(toolName || '');
    const search = SEARCH_TOOL_RE.test(name);
    const cmd = !search && SHELL_TOOL_RE.test(name) ? commandOf(toolInput) : '';
    if (search ? searchFoundNothing(toolResponse) : (cmd && lsFoundNothing(cmd, toolResponse))) {
      turn.fired.empty = true;
      return [{ kind: 'empty', label: search ? name : 'ls' }];
    }
  }
  if (turn.fired.closing) return [];
  if (!SHELL_TOOL_RE.test(String(toolName || ''))) return [];
  const cmd = commandOf(toolInput);
  if (!cmd) return [];

  const segs = segments(cmd);
  const commit = segs.find((s) => COMMIT_RES.some((re) => re.test(s.code)));
  const gate = commit ? null : segs.find((s) => GATE_RES.some((re) => re.test(s.code)));
  let what = null;
  if (commit) what = 'commit';
  else if (gate && !looksFailed(outputText(toolResponse))) what = 'gate';
  if (!what) return [];

  turn.fired.closing = true;
  return [{ kind: 'closing', what, label: labelOf((commit || gate).text) }];
}

function summary(turn) {
  return { tools: turn.tools, preclose: !!(turn.fired && turn.fired.closing) };
}

module.exports = { freshTurn, observe, summary, segments, shellCode };
