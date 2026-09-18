#!/usr/bin/env node
/*
 * Behavioural eval for the CURSOR host, through the Cursor Agent CLI.
 *
 *   node scripts/cursor-eval.js --probe        what the CLI here can and cannot do
 *   node scripts/cursor-eval.js --list         the cases this would run
 *   node scripts/cursor-eval.js --dry-run      the exact commands, no calls
 *   node scripts/cursor-eval.js <plugin>       run one plugin's cases
 *   node scripts/cursor-eval.js                run every plugin's cases
 *
 *   --runs <n>     repetitions per arm (default 3)
 *   --model <id>   passed through to the CLI
 *   --isolate      run with a scratch HOME so globally installed plugins do not
 *                  reach the baseline arm (see below).
 *
 * AGENT_CLI_DRIVER - the marker scripts/test.js looks for to keep this file out
 * of GitHub CI. It starts an external agent, costs API calls and needs an
 * authenticated account; none of that belongs in a push-triggered matrix build.
 *
 *
 * What this measures, and what it CANNOT
 * =====================================
 *
 * Two things were checked against cursor-agent 2026.09.15 before this script
 * was written, because both decide what it is allowed to claim:
 *
 *  1. `--plugin-dir <path>` DOES load a local plugin's skills. Verified with a
 *     synthetic plugin holding a uniquely named skill, which the agent then
 *     reported as available. So the WITH arm is real.
 *
 *  2. The headless CLI does NOT run hooks. A probe hook wired at the PROJECT
 *     level (.cursor/hooks.json -> sessionStart) never fired under `-p`, so it
 *     is not a --plugin-dir limitation: `hooks.json` is simply not executed in
 *     this mode.
 *
 * (2) is the important one. On Cursor these plugins deliver their nudge from
 * hooks, so through this CLI a plugin reduces to its SKILL. That makes this an
 * honest eval of the skill layer and NOT of the wiring. The hook adapters are
 * covered deterministically instead, by scripts/test.js and scripts/hosts.js,
 * which drive them with Cursor-shaped payloads directly.
 *
 * Nothing here says anything about Cursor the IDE, which may well run hooks.
 * The finding is about the headless CLI only.
 *
 *
 * The baseline arm and why --isolate exists
 * =========================================
 *
 * The ablation is WITH `--plugin-dir` against WITHOUT it. That is only valid if
 * the plugin is not reaching the agent some other way - and these plugins are
 * usually installed globally under ~/.cursor/plugins/local, where the CLI picks
 * them up with no flag and offers no way to turn them off. A baseline arm that
 * still has the skill measures nothing.
 *
 * So: the script detects a global install and refuses to report a delta from a
 * contaminated baseline. `--isolate` points HOME at a scratch directory whose
 * .cursor/ has no plugins. On the installs checked so far the CLI keeps its
 * credentials outside HOME, so the session survives that and no API key is
 * needed; if it ever does not, the script asks for CURSOR_API_KEY rather than
 * copying your session file somewhere else.
 *
 * CURSOR_CONFIG_DIR and CURSOR_PLUGIN_ROOT exist in the CLI but were measured
 * NOT to hide an installed plugin, so HOME is the isolation that works.
 *
 * Each invocation gets its own fresh workspace, because the CLI keeps session
 * state per workspace and a shared one leaks the WITH arm into the WITHOUT arm.
 *
 * No dependencies.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

/*
 * This has to be a real binding, not a comment: scripts/test.js strips comments
 * before it looks, so a marker in the header above would be invisible and the
 * guard that keeps this file out of CI would silently pass.
 */
const AGENT_CLI_DRIVER = true;

const ROOT = path.resolve(__dirname, '..');
const PLUGINS = path.join(ROOT, 'plugins');
const GLOBAL_PLUGINS = path.join(os.homedir(), '.cursor', 'plugins', 'local');

/*
 * Grading: a WELL-FORMED block, judged by the plugin's own scanner.
 *
 * The first version of this only looked for the bracket, which is weaker than
 * it sounds - an agent can open `[HANDOFF]` and leave the fork undecided, and
 * the eval would score it. Where a plugin ships a close scanner, that scanner
 * is the grader: a block plus zero violations means the discipline was carried
 * out by the plugin's own rules, not merely announced. persistence has no
 * close scanner, so it keeps a marker.
 *
 * What this does NOT do is invent a pattern that happens to separate the arms
 * on the transcripts at hand. Candidates were measured for the epistemic case -
 * an explicit rivals heading, enumerated falsifier items, the plugin's own
 * violation count - and none separated them; the only things that did were
 * word-choice coincidences (the plural "falsifiers") on four transcripts.
 * Fitting a grader to those would measure vocabulary, not discipline. That
 * case needs a different PROMPT, not a cleverer regex - see its NOTES.md.
 */
const MARKER = {
  'coverage-self-monitoring': /\[COVERAGE (?:LEDGER|CHECK)\]/,
  'epistemic-self-monitoring': /\[EPISTEMIC CLOSE\]/,
  'handoff-self-monitoring': /\[HANDOFF\]/,
  'persistence-self-monitoring': /\[PERSISTENCE CHECK\]/,
  'termination-self-monitoring': /\[TERMINATION CHECK\]/,
  // The executive nudge asks the agent to re-read the active plan. There is no
  // block, so a deterministic grader would be invented rather than observed.
  'executive-self-monitoring': null,
};

/*
 * scanner(plugin) -> (text) -> true when the response carries a well-formed
 * block, using the plugin's own lib. Falls back to the marker when the plugin
 * has no close scanner.
 */
const SCANNER = {
  'coverage-self-monitoring': ['signals.js', (m, t) => { const r = m.scanClose(t); return r.blocks >= 1 && r.violations.length === 0; }],
  'epistemic-self-monitoring': ['scan.js', (m, t) => { const r = m.scan(t); return r.blocks >= 1 && r.violations.length === 0; }],
  'handoff-self-monitoring': ['handoff.js', (m, t) => { const r = m.scan(t); return r.blocks >= 1 && r.violations.length === 0; }],
  'termination-self-monitoring': ['lexicon.js', (m, t) => { const r = m.scan(t); return r.blocks >= 1 && r.violations.length === 0; }],
};

function graderFor(plugin) {
  const marker = MARKER[plugin];
  if (!marker) return null;
  const s = SCANNER[plugin];
  if (!s) return { how: `marker ${marker}`, test: (t) => marker.test(t) };
  const mod = require(path.join(PLUGINS, plugin, 'lib', s[0]));
  return { how: `well-formed block per lib/${s[0]}`, test: (t) => marker.test(t) && s[1](mod, t) };
}

// ---------------------------------------------------------------------------
// The CLI
// ---------------------------------------------------------------------------

/*
 * Installs as `cursor-agent`, with an `agent` alias. On Windows both are
 * .cmd/.ps1 shims under %LOCALAPPDATA%\cursor-agent (the two shims were
 * checked and behave identically); elsewhere a binary under ~/.local/bin.
 * CURSOR_AGENT_BIN overrides the search.
 */
function findCli() {
  if (process.env.CURSOR_AGENT_BIN) {
    return fs.existsSync(process.env.CURSOR_AGENT_BIN)
      ? { bin: process.env.CURSOR_AGENT_BIN, how: 'CURSOR_AGENT_BIN' } : null;
  }
  // `agent` is the name the CLI is invoked by; `cursor-agent` is the longer
  // alias. Both shims were checked and behave identically, but prefer the one
  // people actually type.
  const win = process.platform === 'win32';
  const names = win ? ['agent.cmd', 'cursor-agent.cmd', 'agent.exe', 'cursor-agent.exe'] : ['agent', 'cursor-agent'];
  const dirs = [
    path.join(os.homedir(), 'AppData', 'Local', 'cursor-agent'),
    path.join(os.homedir(), '.local', 'bin'),
    '/usr/local/bin',
    '/opt/homebrew/bin',
  ];
  for (const d of dirs) {
    for (const n of names) {
      const p = path.join(d, n);
      if (fs.existsSync(p)) return { bin: p, how: `found in ${d}` };
    }
  }
  for (const n of names) {
    const r = spawnSync(win ? 'where' : 'which', [n], { encoding: 'utf8' });
    const hit = (r.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    if (hit && fs.existsSync(hit)) return { bin: hit, how: 'on PATH' };
  }
  return null;
}

/*
 * `input` is the PROMPT, and it goes on stdin rather than in argv.
 *
 * On Windows the CLI is a .cmd shim, which spawnSync can only start through a
 * shell - and a shell truncates a multi-line argument at the first newline.
 * Every case prompt here is multi-line, so passing them in argv delivered only
 * the opening sentence: the agent replied "your message looks cut off", and a
 * whole run scored two plugins at 0% for a discipline they were never asked to
 * exercise. stdin sidesteps shell quoting entirely.
 */
function run(bin, args, env, input) {
  return spawnSync(bin, args, {
    encoding: 'utf8',
    timeout: 300000,
    shell: /\.cmd$/i.test(bin),
    env: Object.assign({}, process.env, env || {}),
    input: typeof input === 'string' ? input : undefined,
  });
}

function authState(bin, env) {
  const r = run(bin, ['status'], env);
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  if (/not logged in|authentication required/i.test(out)) return { ok: false, why: 'not logged in' };
  if (r.status !== 0) return { ok: false, why: out.trim().split(/\r?\n/)[0] || `status exited ${r.status}` };
  return { ok: true, who: out.trim().split(/\r?\n/).find(Boolean) || 'authenticated' };
}

const globalInstalls = () => {
  try { return fs.readdirSync(GLOBAL_PLUGINS).filter((d) => d.endsWith('-self-monitoring')); } catch (_) { return []; }
};

// ---------------------------------------------------------------------------
// Cases, reused from the `claude plugin eval` suites
// ---------------------------------------------------------------------------

function cases(filter) {
  const out = [];
  for (const name of fs.readdirSync(PLUGINS).sort()) {
    if (filter && name.indexOf(filter) === -1) continue;
    const evalDir = path.join(PLUGINS, name, 'evals');
    if (!fs.existsSync(evalDir)) continue;
    for (const c of fs.readdirSync(evalDir)) {
      const dir = path.join(evalDir, c);
      if (!fs.statSync(dir).isDirectory() || c === 'results') continue;
      const prompt = path.join(dir, 'prompt.md');
      if (!fs.existsSync(prompt)) continue;
      out.push({ plugin: name, id: c, prompt: fs.readFileSync(prompt, 'utf8').trim(), grader: graderFor(name) });
    }
  }
  return out;
}

/*
 * `--mode ask` keeps the run read-only: these cases want a written answer, not
 * edits. `--trust` is required because the CLI refuses a directory it has not
 * been told to trust - the workspace is a scratch dir this script creates, not
 * the repository.
 */
function argsFor(c, withPlugin, model, workspace) {
  const a = ['-p', '--output-format', 'text', '--mode', 'ask', '--trust', '--workspace', workspace];
  if (model) a.push('--model', model);
  if (withPlugin) a.push('--plugin-dir', path.join(PLUGINS, c.plugin));
  return a; // the prompt is NOT here - it goes on stdin, see run()
}

const quote = (s) => (/[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);

/*
 * A FRESH workspace per invocation, not one shared by the whole run.
 *
 * The CLI keeps session state per workspace, so reusing one directory leaks the
 * WITH arm into the WITHOUT arm that follows it: the first measured baseline
 * scored 100% on a block it had no skill for, purely because the plugin arm had
 * just run in the same directory. A fresh directory each time is the only thing
 * that makes the two arms independent.
 */
let wsSeq = 0;
function scratchWorkspace() {
  const d = path.join(os.tmpdir(), `cursor-eval-${process.pid}-${Date.now()}-${wsSeq++}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// A HOME whose .cursor has no plugins, so the baseline arm really is bare.
function isolatedHome() {
  const h = path.join(os.tmpdir(), `cursor-eval-home-${process.pid}-${Date.now()}`);
  fs.mkdirSync(path.join(h, '.cursor', 'plugins'), { recursive: true });
  return { HOME: h, USERPROFILE: h };
}

// ---------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const has = (f) => argv.includes(f);
  const val = (f, d) => { const i = argv.indexOf(f); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };
  const flagged = new Set(['--runs', '--model']);
  const filter = argv.find((a, i) => !a.startsWith('--') && !flagged.has(argv[i - 1]));
  const runs = parseInt(val('--runs', '3'), 10) || 3;
  const model = val('--model', null);
  const isolate = has('--isolate');

  const cli = findCli();
  const installed = globalInstalls();

  if (has('--probe')) {
    if (!cli) {
      console.log('Cursor Agent CLI: NOT FOUND');
      console.log('  Looked under ~/AppData/Local/cursor-agent, ~/.local/bin, /usr/local/bin,');
      console.log('  /opt/homebrew/bin and on PATH. Set CURSOR_AGENT_BIN to point at it.');
      process.exitCode = 1;
      return;
    }
    console.log(`Cursor Agent CLI : ${cli.bin}  (${cli.how})`);
    console.log(`  version        : ${(run(cli.bin, ['--version']).stdout || '').trim() || '(unknown)'}`);
    const auth = authState(cli.bin);
    console.log(`  auth           : ${auth.ok ? auth.who : `NOT USABLE - ${auth.why}`}`);
    const help = `${run(cli.bin, ['--help']).stdout || ''}`;
    for (const f of ['--plugin-dir', '--output-format', '--print', '--mode', '--trust', '--workspace']) {
      console.log(`  ${f.padEnd(15)}: ${help.includes(f) ? 'supported' : 'NOT in --help'}`);
    }
    console.log('\nWhat the CLI can be used for here');
    console.log('  skills via --plugin-dir : YES (verified with a synthetic probe plugin)');
    console.log('  hooks from hooks.json   : NO  - not executed in headless -p mode. Verified with a');
    console.log('                            project-level .cursor/hooks.json probe that never fired.');
    console.log('                            So this eval measures the SKILL layer only; the hook');
    console.log('                            adapters are covered by scripts/test.js + scripts/hosts.js.');
    console.log(`\nGlobally installed self-monitoring plugins: ${installed.length ? installed.join(', ') : 'none'}`);
    if (installed.length) {
      console.log('  These load with no flag and cannot be turned off, so the WITHOUT arm is not a');
      console.log('  baseline unless you pass --isolate (which needs CURSOR_API_KEY).');
    }
    return;
  }

  const found = cases(filter);
  if (!found.length) { console.error(filter ? `no cases match "${filter}"` : 'no cases found'); process.exitCode = 1; return; }

  if (has('--list')) {
    console.log(`${found.length} case(s):\n`);
    for (const c of found) {
      console.log(`  ${c.plugin}/${c.id}`);
      console.log(`    grading: ${c.grader ? c.grader.how : 'SKIPPED - no protocol block, needs a judge model'}`);
    }
    return;
  }

  if (has('--dry-run')) {
    const bin = cli ? cli.bin : 'cursor-agent';
    const ws = '<scratch workspace>';
    for (const c of found) {
      for (const withPlugin of [true, false]) {
        const a = argsFor(c, withPlugin, model, ws);
        console.log(`${withPlugin ? 'with   ' : 'without'}  ${quote(bin)} ${a.map(quote).join(' ')}   < ${c.plugin}/${c.id}/prompt.md`);
      }
    }
    const scored = found.filter((c) => c.grader).length;
    console.log(`\n${scored} scored case(s) x 2 arms x ${runs} run(s) = ${scored * 2 * runs} invocations`);
    console.log(`${found.length - scored} case(s) skipped (no protocol block to check)`);
    if (isolate) console.log('--isolate: a scratch HOME per run; needs CURSOR_API_KEY');
    return;
  }

  // --- the run ---

  if (!cli) {
    console.error('Cursor Agent CLI not found. `node scripts/cursor-eval.js --probe` says where it looked.');
    process.exitCode = 1;
    return;
  }
  if (installed.length && !isolate) {
    console.error(`These plugins are installed globally in ${GLOBAL_PLUGINS}:`);
    console.error(`  ${installed.join(', ')}`);
    console.error('\nThe CLI loads them with no flag and has no way to disable them, so the WITHOUT');
    console.error('arm would still have the skill and the delta would mean nothing.');
    console.error('\nRun with --isolate (a scratch HOME, authenticated through CURSOR_API_KEY), or');
    console.error('uninstall them from Cursor first. Refusing to report a contaminated ablation.');
    process.exitCode = 1;
    return;
  }

  /*
   * A scratch HOME hides ~/.cursor/plugins, and on the installs checked so far
   * the session survives it - the CLI keeps its credentials outside HOME. So
   * try the isolated environment first and only ask for CURSOR_API_KEY if the
   * session really did not come along. (An earlier version demanded the key up
   * front, on the assumption that isolation would break auth. It does not.)
   */
  const env = isolate ? isolatedHome() : {};
  let auth = authState(cli.bin, env);
  if (!auth.ok && isolate && !process.env.CURSOR_API_KEY) {
    console.error('--isolate points HOME at a scratch directory and the session did not follow.');
    console.error('Set CURSOR_API_KEY. This script will not copy your credentials elsewhere.');
    process.exitCode = 1;
    return;
  }
  if (!auth.ok) {
    console.error(`Cursor Agent CLI is present (${cli.bin}) but ${auth.why}.`);
    console.error(isolate ? 'Check CURSOR_API_KEY.' : 'Run `agent login`.');
    process.exitCode = 1;
    return;
  }

  const outDir = path.join(ROOT, 'evals', 'results', `cursor-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Cursor Agent ${(run(cli.bin, ['--version'], env).stdout || '').trim()}`);
  console.log(`skill layer only - hooks do not run in headless mode (see --probe)\n`);

  const rows = [];
  for (const c of found) {
    if (!c.grader) { console.log(`${c.plugin}/${c.id}: skipped - needs a judge model`); continue; }
    const score = { with: 0, without: 0 };
    for (const withPlugin of [true, false]) {
      for (let i = 0; i < runs; i++) {
        const r = run(cli.bin, argsFor(c, withPlugin, model, scratchWorkspace()), env, c.prompt);
        const text = `${r.stdout || ''}`;
        fs.writeFileSync(path.join(outDir, `${c.plugin}__${c.id}__${withPlugin ? 'with' : 'without'}__${i + 1}.txt`), text);
        if (c.grader.test(text)) score[withPlugin ? 'with' : 'without'] += 1;
      }
    }
    const w = score.with / runs;
    const wo = score.without / runs;
    console.log(`${c.plugin}/${c.id}`);
    console.log(`  with: ${(w * 100).toFixed(0)}%   without: ${(wo * 100).toFixed(0)}%   delta: ${((w - wo) * 100).toFixed(0)} pts`);
    rows.push({ c, with: w, without: wo });
  }

  const proved = rows.filter((r) => r.with > r.without);
  console.log(`\n${proved.length}/${rows.length} case(s) show the skill changing the output on Cursor.`);
  console.log(`transcripts: ${outDir}`);
  if (rows.length && proved.length < rows.length) {
    console.log('A case both arms score the same on proves nothing - rewrite its prompt so the');
    console.log('failure it targets is the likely answer without the plugin.');
  }
}

if (require.main === module) main();
module.exports = { findCli, authState, cases, argsFor, globalInstalls, graderFor, MARKER, SCANNER };
