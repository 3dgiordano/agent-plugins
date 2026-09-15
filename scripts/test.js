#!/usr/bin/env node
/*
 * Test suite for the agent-plugins collection. No dependencies: node:test
 * (Node >= 18). Run with `node scripts/test.js`.
 *
 * Two layers:
 *   structure - every plugin has its three manifests, a skill with frontmatter,
 *               is registered in both marketplaces, and its versions agree
 *   behaviour - each hook adapter is driven end-to-end as its host would drive
 *               it (JSON on stdin, output/exit code inspected), for Claude Code
 *               and Cursor alike
 *
 * Hooks keep per-session state in the OS temp dir; every test uses a unique
 * session id and cleans up after itself, so runs never interfere.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLUGINS = path.join(ROOT, 'plugins');
const MANIFESTS = ['plugin.json', '.claude-plugin/plugin.json', '.cursor-plugin/plugin.json'];

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const plugin = (name) => path.join(PLUGINS, name);
const uid = (p) => `${p}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Drive a hook script exactly as a host would: JSON on stdin, capture stdout/stderr/exit.
function hook(pluginName, script, input, env) {
  const r = spawnSync(process.execPath, [path.join(plugin(pluginName), script)], {
    input: JSON.stringify(input), encoding: 'utf8',
    env: Object.assign({}, process.env, { CLAUDECODE: '1' }, env || {}),
    cwd: plugin(pluginName)
  });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function cleanupTemp(prefix) {
  for (const f of fs.readdirSync(os.tmpdir())) {
    if (f.startsWith(prefix)) { try { fs.unlinkSync(path.join(os.tmpdir(), f)); } catch (_) {} }
  }
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

const pluginNames = fs.readdirSync(PLUGINS).filter((d) => fs.statSync(plugin(d)).isDirectory());

test('collection has plugins', () => {
  assert.ok(pluginNames.length >= 1);
});

for (const name of pluginNames) {
  test(`${name}: three manifests exist, agree on name and version, and are valid JSON`, () => {
    const versions = new Set();
    for (const rel of MANIFESTS) {
      const f = path.join(plugin(name), rel);
      assert.ok(fs.existsSync(f), `${rel} missing`);
      const j = readJson(f);
      assert.equal(j.name, name, `${rel}: name mismatch`);
      assert.match(j.version, /^\d+\.\d+\.\d+/, `${rel}: bad version`);
      versions.add(j.version);
    }
    assert.equal(versions.size, 1, `versions differ: ${[...versions].join(', ')}`);
  });

  test(`${name}: Agent Plugins manifest declares the 1.0.0 schema and only allowed fields`, () => {
    const j = readJson(path.join(plugin(name), 'plugin.json'));
    assert.equal(j.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
    const allowed = new Set(['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords', 'extensions']);
    for (const k of Object.keys(j)) assert.ok(allowed.has(k), `unexpected field ${k}`);
  });

  test(`${name}: skill exists with name/description frontmatter matching the plugin`, () => {
    const f = path.join(plugin(name), 'skills', name, 'SKILL.md');
    assert.ok(fs.existsSync(f), 'SKILL.md missing');
    const head = fs.readFileSync(f, 'utf8').split('\n').slice(0, 10).join('\n');
    assert.match(head, /^---\n/, 'no frontmatter');
    assert.match(head, new RegExp(`^name: ${name}$`, 'm'), 'frontmatter name mismatch');
    assert.match(head, /^description: .+/m, 'no description');
  });

  test(`${name}: hook configs are valid JSON and reference existing scripts`, () => {
    const claude = path.join(plugin(name), 'hooks', 'hooks.json');
    if (fs.existsSync(claude)) {
      const j = readJson(claude);
      for (const entries of Object.values(j.hooks)) for (const e of entries) for (const h of e.hooks) {
        const m = h.command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/);
        assert.ok(m, `command not rooted at CLAUDE_PLUGIN_ROOT: ${h.command}`);
        assert.ok(fs.existsSync(path.join(plugin(name), m[1])), `script missing: ${m[1]}`);
      }
    }
    const cursorManifest = readJson(path.join(plugin(name), '.cursor-plugin/plugin.json'));
    if (cursorManifest.hooks) {
      const cf = path.join(plugin(name), cursorManifest.hooks);
      assert.ok(fs.existsSync(cf), `cursor hooks file missing: ${cursorManifest.hooks}`);
      const j = readJson(cf);
      for (const entries of Object.values(j.hooks)) for (const e of entries) {
        const m = e.command.match(/^node \.\/(\S+)/);
        assert.ok(m, `cursor command should be "node ./<script>": ${e.command}`);
        assert.ok(fs.existsSync(path.join(plugin(name), m[1])), `script missing: ${m[1]}`);
      }
    }
  });

  test(`${name}: every JS file loads without syntax errors`, () => {
    const walk = (d) => fs.readdirSync(d).flatMap((f) => {
      const p = path.join(d, f);
      return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
    });
    for (const f of walk(plugin(name))) {
      const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
      assert.equal(r.status, 0, `${path.relative(ROOT, f)}: ${r.stderr}`);
    }
  });
}

test('both marketplaces list every plugin, and only existing ones', () => {
  for (const mp of ['.claude-plugin/marketplace.json', '.cursor-plugin/marketplace.json']) {
    const j = readJson(path.join(ROOT, mp));
    const listed = j.plugins.map((p) => p.name).sort();
    assert.deepEqual(listed, [...pluginNames].sort(), `${mp} plugin list differs from plugins/`);
    for (const p of j.plugins) assert.equal(p.source, `./plugins/${p.name}`, `${mp}: ${p.name} source`);
  }
});

test('scripts/version.js --check passes', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/version.js'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

// ---------------------------------------------------------------------------
// executive-self-monitoring
// ---------------------------------------------------------------------------

test('executive: fires on turn 1, silent on 2-4, fires on 5', (t) => {
  const sid = uid('exec');
  t.after(() => cleanupTemp(`claude_execmon_${sid}`));
  const P = 'executive-self-monitoring';
  const turn = () => hook(P, 'hooks/exec-monitor.js', { session_id: sid, cwd: os.tmpdir() });
  assert.match(turn().out, /executive self-monitoring/);
  for (let i = 2; i <= 4; i++) assert.equal(turn().out, '', `turn ${i} should be silent`);
  assert.match(turn().out, /executive self-monitoring/);
});

test('executive: cursor sessionStart returns additional_context', () => {
  const r = hook('executive-self-monitoring', 'cursor/exec-monitor-cursor.js', {}, { CLAUDECODE: '' });
  assert.equal(r.code, 0);
  assert.match(JSON.parse(r.out).additional_context, /executive self-monitoring/);
});

test('executive: malformed stdin never fails the hook', () => {
  const r = spawnSync(process.execPath, [path.join(plugin('executive-self-monitoring'), 'hooks/exec-monitor.js')], { input: 'not json', encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

// ---------------------------------------------------------------------------
// epistemic-self-monitoring
// ---------------------------------------------------------------------------

const EPI = 'epistemic-self-monitoring';
const badBlock = '[EPISTEMIC CLOSE]\n- Claim: x is dead code\n- Status: verified\n- Scope: only module y\n';
const goodBlock = '[EPISTEMIC CLOSE]\n- Claim: x is dead code\n- Status: verified\n- Verified by: grep -rn x src/ (0 hits), removed, suite green\n- Scope: only module y\n';
const conjBlock = '[EPISTEMIC CLOSE]\n- Claim: skew causes the flake\n- Status: conjecture\n- Falsifier: pin the clock in CI\n- Scope: nightly job\n';

test('epistemic scanner: judges only blocks, and only by the three rules', () => {
  const { scan } = require(path.join(plugin(EPI), 'lib/scan.js'));
  assert.equal(scan('prose that says "the cause is X" with no block').violations.length, 0);
  assert.equal(scan('docs that mention `[EPISTEMIC CLOSE]` blocks, or [EPISTEMIC CLOSE] inline, are not closures').blocks, 0);
  assert.equal(scan('  [EPISTEMIC CLOSE]  \n- Claim: indented marker still counts\n- Status: observed\n- Evidence: x\n- Scope: y\n').blocks, 1);
  assert.equal(scan(goodBlock).violations.length, 0);
  assert.equal(scan(conjBlock).violations.length, 0);
  const bad = scan(badBlock).violations;
  assert.equal(bad.length, 1);
  assert.match(bad[0], /Verified by/);
  const noFalsifier = scan(conjBlock.replace(/- Falsifier:.*\n/, '')).violations;
  assert.equal(noFalsifier.length, 1);
  assert.match(noFalsifier[0], /Falsifier/);
  const placeholder = scan(goodBlock.replace(/Verified by: .*/, 'Verified by: <what was run>')).violations;
  assert.equal(placeholder.length, 1, 'template placeholder must count as empty');
  assert.equal(scan(badBlock.replace(/- Scope:.*\n/, '')).violations.length, 2);
  assert.deepEqual(scan('[observed] a [conjecture] b [verified - by: c]').tags, { observed: 1, conjecture: 1, verified: 1 });
});

test('epistemic (claude): load on turn 1, retrospective after a bad close, silent otherwise', (t) => {
  const sid = uid('epi');
  t.after(() => cleanupTemp(`epimon_claude_${sid}`));
  const cc = (x) => Object.assign({ session_id: sid, cwd: os.tmpdir() }, x);
  assert.match(hook(EPI, 'hooks/epi-prompt.js', cc({})).out, /epistemic self-monitoring/);
  assert.equal(hook(EPI, 'hooks/epi-prompt.js', cc({})).out, '');
  const stop = hook(EPI, 'hooks/epi-stop.js', cc({ last_assistant_message: badBlock }));
  assert.equal(stop.code, 0, 'non-strict never blocks');
  assert.match(hook(EPI, 'hooks/epi-prompt.js', cc({})).out, /unresolved epistemic gaps/);
  assert.equal(hook(EPI, 'hooks/epi-prompt.js', cc({})).out, '', 'retrospective is consumed once');
});

test('epistemic (claude): strict mode blocks once with exit 2, never re-blocks, passes good blocks', (t) => {
  const sid = uid('epi');
  t.after(() => cleanupTemp(`epimon_claude_${sid}`));
  const strict = { EPIMON_STRICT: '1' };
  const cc = (x) => Object.assign({ session_id: sid, cwd: os.tmpdir() }, x);
  const blocked = hook(EPI, 'hooks/epi-stop.js', cc({ last_assistant_message: badBlock }), strict);
  assert.equal(blocked.code, 2);
  assert.match(blocked.err, /Epistemic closure gate/);
  assert.equal(hook(EPI, 'hooks/epi-stop.js', cc({ last_assistant_message: badBlock, stop_hook_active: true }), strict).code, 0);
  assert.equal(hook(EPI, 'hooks/epi-stop.js', cc({ last_assistant_message: goodBlock }), strict).code, 0);
  assert.equal(hook(EPI, 'hooks/epi-stop.js', cc({ last_assistant_message: 'done' }), strict).code, 0);
});

test('epistemic (claude): observe nudge every 6th shell command and on first error', (t) => {
  const sid = uid('epi');
  t.after(() => cleanupTemp(`epimon_claude_${sid}`));
  const obs = (out) => hook(EPI, 'hooks/epi-observe.js', { session_id: sid, cwd: os.tmpdir(), tool_name: 'Bash', tool_output: out });
  assert.match(JSON.parse(obs('Exit code 1\nerror: boom').out).hookSpecificOutput.additionalContext, /observation/, 'first error fires');
  assert.equal(obs('Exit code 1').out, '', 'second error is gap-limited');
  for (let i = 3; i <= 5; i++) assert.equal(obs('ok').out, '');
  assert.equal(JSON.parse(obs('ok').out).hookSpecificOutput.hookEventName, 'PostToolUse', '6th fires');
});

test('epistemic (cursor): sessionStart, postToolUse filter, afterAgentResponse + stop gate', (t) => {
  const cid = uid('epic');
  t.after(() => cleanupTemp(`epimon_cursor_${cid}`));
  const noCC = { CLAUDECODE: '' };
  assert.match(JSON.parse(hook(EPI, 'cursor/epi-session-start.js', {}, noCC).out).additional_context, /epistemic/);
  const cu = (x) => Object.assign({ conversation_id: cid, workspace_roots: [os.tmpdir()] }, x);
  assert.equal(hook(EPI, 'cursor/epi-observe-cursor.js', cu({ tool_name: 'read_file', tool_output: 'error' }), noCC).out, '', 'non-shell ignored');
  assert.match(hook(EPI, 'cursor/epi-observe-cursor.js', cu({ tool_name: 'run_terminal_cmd', tool_output: 'error: x' }), noCC).out, /additional_context/);
  assert.equal(hook(EPI, 'cursor/epi-response-cursor.js', cu({ text: badBlock }), noCC).out, '');
  assert.equal(hook(EPI, 'cursor/epi-stop-cursor.js', cu({ status: 'completed', loop_count: 0 }), noCC).out, '', 'non-strict: nothing');
  hook(EPI, 'cursor/epi-response-cursor.js', cu({ text: badBlock }), noCC);
  const strictStop = hook(EPI, 'cursor/epi-stop-cursor.js', cu({ status: 'completed', loop_count: 0 }), Object.assign({ EPIMON_STRICT: '1' }, noCC));
  assert.match(JSON.parse(strictStop.out).followup_message, /Epistemic closure gate/);
  hook(EPI, 'cursor/epi-response-cursor.js', cu({ text: badBlock }), noCC);
  assert.equal(hook(EPI, 'cursor/epi-stop-cursor.js', cu({ status: 'completed', loop_count: 1 }), Object.assign({ EPIMON_STRICT: '1' }, noCC)).out, '', 'loop_count>0 never re-blocks');
});

// ---------------------------------------------------------------------------
// persistence-self-monitoring
// ---------------------------------------------------------------------------

const PER = 'persistence-self-monitoring';

test('persistence signals: thresholds fire once per crossing, error signatures normalize', () => {
  const S = require(path.join(plugin(PER), 'lib/signals.js'));
  const t = S.freshTurn();
  const kinds = (r) => r.map((s) => s.kind);
  for (let i = 1; i <= 3; i++) assert.deepEqual(S.observe(t, 'Edit', { file_path: 'a.js' }, ''), []);
  assert.deepEqual(kinds(S.observe(t, 'Edit', { file_path: 'a.js' }, '')), ['edits']);
  assert.deepEqual(S.observe(t, 'Edit', { file_path: 'a.js' }, ''), [], '5th edit silent');
  for (let i = 1; i <= 2; i++) assert.deepEqual(S.observe(t, 'Bash', { command: 'npm test' }, `Error: got ${i} at /tmp/${i}/x.js:${i}`), []);
  const third = S.observe(t, 'Bash', { command: 'npm test' }, 'Error: got 3 at C:\\tmp\\3\\x.js:30');
  assert.deepEqual(kinds(third).sort(), ['cmds', 'errs']);
  assert.equal(third.find((s) => s.kind === 'errs').key, 'Error: got # at <path>:#');
  assert.deepEqual(S.observe(t, 'Bash', { command: 'npm test' }, 'all green'), [], 'success not counted');
  while (t.tools < 29) S.observe(t, 'Read', { file_path: 'r' }, '');
  assert.deepEqual(kinds(S.observe(t, 'Grep', {}, '')), ['effort']);
  assert.deepEqual(S.observe(t, 'Grep', {}, ''), []);
  assert.equal(S.summary(t).maxEditsSameFile, 5);
});

test('persistence (claude): turn boundary resets counters; nudges carry counts; stop never blocks', (t) => {
  const sid = uid('per');
  t.after(() => cleanupTemp(`persistmon_claude_${sid}`));
  const cc = (x) => Object.assign({ session_id: sid, cwd: os.tmpdir() }, x);
  assert.match(hook(PER, 'hooks/persist-prompt.js', cc({})).out, /persistence self-monitoring/);
  const edit = () => hook(PER, 'hooks/persist-observe.js', cc({ tool_name: 'Edit', tool_input: { file_path: 'src/a.js' }, tool_output: 'ok' }));
  for (let i = 1; i <= 3; i++) assert.equal(edit().out, '');
  assert.match(JSON.parse(edit().out).hookSpecificOutput.additionalContext, /edited `src\/a\.js` 4 times/);
  assert.equal(hook(PER, 'hooks/persist-stop.js', cc({})).code, 0);
  assert.equal(hook(PER, 'hooks/persist-prompt.js', cc({})).out, '', 'turn 2 silent');
  assert.equal(edit().out, '', 'counters reset on new turn');
});

test('persistence (cursor): sessionStart, postToolUse with Cursor tool names, afterAgentResponse resets', (t) => {
  const cid = uid('perc');
  t.after(() => cleanupTemp(`persistmon_cursor_${cid}`));
  const noCC = { CLAUDECODE: '' };
  assert.match(JSON.parse(hook(PER, 'cursor/persist-session-start.js', {}, noCC).out).additional_context, /persistence/);
  const cu = (x) => Object.assign({ conversation_id: cid, workspace_roots: [os.tmpdir()] }, x);
  const fail = () => hook(PER, 'cursor/persist-observe-cursor.js', cu({ tool_name: 'run_terminal_cmd', tool_input: { command: 'make' }, tool_output: 'make: *** [all] Error 2' }), noCC);
  assert.equal(fail().out, ''); assert.equal(fail().out, '');
  assert.match(JSON.parse(fail().out).additional_context, /`make` has failed 3 times/);
  assert.equal(hook(PER, 'cursor/persist-response-cursor.js', cu({ text: 'done' }), noCC).out, '');
  assert.equal(fail().out, '', 'counters reset after response');
});

// ---------------------------------------------------------------------------
// Logging (shared contract across plugins)
// ---------------------------------------------------------------------------

test('logging is off by default and writes host-routed JSONL when enabled', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-plugins-log-'));
  const sid = uid('log');
  t.after(() => { fs.rmSync(dir, { recursive: true, force: true }); cleanupTemp(`epimon_claude_${sid}`); cleanupTemp(`persistmon_claude_${sid}`); cleanupTemp(`claude_execmon_${sid}`); });
  hook('executive-self-monitoring', 'hooks/exec-monitor.js', { session_id: sid, cwd: dir });
  hook(EPI, 'hooks/epi-prompt.js', { session_id: sid, cwd: dir });
  hook(PER, 'hooks/persist-prompt.js', { session_id: sid, cwd: dir });
  assert.ok(!fs.existsSync(path.join(dir, '.claude')), 'no log files without the env var');
  hook('executive-self-monitoring', 'hooks/exec-monitor.js', { session_id: sid, cwd: dir }, { EXECMON_LOG: '1' });
  hook(EPI, 'hooks/epi-prompt.js', { session_id: sid, cwd: dir }, { EPIMON_LOG: '1' });
  hook(PER, 'hooks/persist-prompt.js', { session_id: sid, cwd: dir }, { PERSISTMON_LOG: '1' });
  for (const f of ['executive-self-monitoring', 'epistemic-self-monitoring', 'persistence-self-monitoring']) {
    const p = path.join(dir, '.claude', 'logs', `${f}.jsonl`);
    assert.ok(fs.existsSync(p), `${f} log missing`);
    const line = JSON.parse(fs.readFileSync(p, 'utf8').trim().split('\n').pop());
    assert.equal(line.event, 'prompt');
    assert.ok(line.ts);
  }
  hook(EPI, 'cursor/epi-session-start.js', {}, { CLAUDECODE: '', CLAUDE_PLUGIN_ROOT: '', EPIMON_LOG: '1', CURSOR_PROJECT_DIR: dir });
  assert.ok(fs.existsSync(path.join(dir, '.cursor', 'logs', 'epistemic-self-monitoring.jsonl')), 'cursor host routes to .cursor/logs');
});
