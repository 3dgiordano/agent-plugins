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
  return { tools: 0, fired: { closing: false } };
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
 * patterns found them there (2026-09-25 review of the owner's sessions).
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
 * ends on, which is what the last-segment label showed in 182 of 184
 * pre-close notices in the owner's sessions.
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
