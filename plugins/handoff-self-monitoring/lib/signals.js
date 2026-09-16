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

// A stable, short label for the log and the nudge: the first word or two of
// the command that matched ("git commit", "npm test").
function labelOf(cmd) {
  const m = cmd.match(/(?:^|&&|;|\|\|?)\s*([^&;|]+)$/);
  const last = (m ? m[1] : cmd).trim();
  return last.split(/\s+/).slice(0, 2).join(' ').slice(0, 40);
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

  let what = null;
  if (COMMIT_RES.some((re) => re.test(cmd))) what = 'commit';
  else if (GATE_RES.some((re) => re.test(cmd)) && !looksFailed(outputText(toolResponse))) what = 'gate';
  if (!what) return [];

  turn.fired.closing = true;
  return [{ kind: 'closing', what, label: labelOf(cmd) }];
}

function summary(turn) {
  return { tools: turn.tools, preclose: !!(turn.fired && turn.fired.closing) };
}

module.exports = { freshTurn, observe, summary };
