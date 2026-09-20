#!/usr/bin/env node
/*
 * Calibrate the hooks' thresholds against real session logs.
 *
 *   node scripts/calibrate.js [dir ...]
 *
 * Reads the opt-in JSONL logs each plugin writes when its *_LOG env var is
 * set (<project>/.claude/logs/<plugin>.jsonl and <project>/.cursor/logs/...),
 * from the given project directories (default: the current one), and prints,
 * per signal:
 *
 *   - the distribution of the raw per-turn measurement the threshold is
 *     compared against (p50 / p90 / p95 / max), and
 *   - the nudge rate - the share of turns that would have received a nudge -
 *     at the current threshold and at each candidate around it.
 *
 * It does not pick a threshold. A nudge is a signal only if it is rare
 * (a target band of roughly 5-15 % of turns is a reasonable starting point:
 * above that it is wallpaper, below that it is missing the turns it exists
 * for); where in that band each one belongs is a judgment about the sessions
 * you logged, which is why the what-if table is printed instead.
 *
 * No dependencies. Reads only; writes nothing.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PLUGINS = {
  'persistence-self-monitoring': {
    env: 'PERSISTMON_LOG',
    turns: (e) => e.event === 'turn',
    signals: [
      { name: 'same file edited (EDITS_SAME_FILE)', current: 4, value: (e) => e.maxEditsSameFile, candidates: [2, 3, 4, 5, 6, 8] },
      { name: 'same command failing (REPEAT_FAILURES)', current: 3, value: (e) => e.maxRepeatCmd, candidates: [2, 3, 4, 5, 6] },
      { name: 'same error recurring (REPEAT_FAILURES)', current: 3, value: (e) => e.maxRepeatErr, candidates: [2, 3, 4, 5, 6] },
      { name: 'tool calls per turn (TOOL_CALLS_STEP)', current: 30, value: (e) => e.tools, candidates: [15, 20, 30, 40, 50, 75] },
    ],
  },
  'coverage-self-monitoring': {
    env: 'COVMON_LOG',
    turns: (e) => e.event === 'stop',
    signals: [
      { name: 'stub markers written per turn (STUBS_STEP)', current: 3, value: (e) => e.stubs, candidates: [1, 2, 3, 4, 5, 8] },
    ],
    prompts: { filter: (e) => e.event === 'prompt', name: 'enumerated parts per prompt (PARTS_MIN)', current: 3, value: (e) => e.parts, candidates: [2, 3, 4, 5, 6] },
    rates: [
      { name: 'turns ending with deferral language', filter: (e) => e.event === 'stop', hit: (e) => (e.deferrals || []).length > 0 },
      { name: '  ... of which with no [COVERAGE CHECK]', filter: (e) => e.event === 'stop' && (e.deferrals || []).length > 0, hit: (e) => !e.blocks },
      { name: 'ledger asked (prompt had >= PARTS_MIN parts)', filter: (e) => e.event === 'prompt', hit: (e) => !!e.ledger },
    ],
  },
  'termination-self-monitoring': {
    env: 'TERMMON_LOG',
    turns: (e) => e.event === 'stop',
    signals: [
      { name: 'apology / self-criticism phrases per message (APOLOGY_RUN)', current: 3, value: (e) => e.apologies, candidates: [2, 3, 4, 5] },
    ],
    rates: [
      { name: 'turns ending on a state-shaped reason (any hit)', filter: (e) => e.event === 'stop', hit: (e) => (e.hits || []).length > 0 },
      { name: '  budget', filter: (e) => e.event === 'stop', hit: (e) => (e.hits || []).some((h) => h.kind === 'budget') },
      { name: '  confidence', filter: (e) => e.event === 'stop', hit: (e) => (e.hits || []).some((h) => h.kind === 'confidence') },
      { name: '  complexity', filter: (e) => e.event === 'stop', hit: (e) => (e.hits || []).some((h) => h.kind === 'complexity') },
      { name: '  ... of which with a [TERMINATION CHECK] block', filter: (e) => e.event === 'stop' && (e.hits || []).length > 0, hit: (e) => e.blocks > 0 },
      { name: 'stops blocked (strict mode)', filter: (e) => e.event === 'stop', hit: (e) => !!e.blocked },
    ],
  },
  'handoff-self-monitoring': {
    env: 'HANDMON_LOG',
    turns: (e) => e.event === 'stop',
    rates: [
      { name: 'turns ending on a decision not handed off (any hit)', filter: (e) => e.event === 'stop', hit: (e) => (e.hits || []).length > 0 },
      { name: '  offer', filter: (e) => e.event === 'stop', hit: (e) => (e.hits || []).some((h) => h.kind === 'offer') },
      { name: '  fork', filter: (e) => e.event === 'stop', hit: (e) => (e.hits || []).some((h) => h.kind === 'fork') },
      { name: '  closing question', filter: (e) => e.event === 'stop', hit: (e) => (e.hits || []).some((h) => h.kind === 'question') },
      { name: '  returned coverage part', filter: (e) => e.event === 'stop', hit: (e) => (e.hits || []).some((h) => h.kind === 'returned') },
      { name: '  ... of which with a [HANDOFF] block', filter: (e) => e.event === 'stop' && (e.hits || []).length > 0, hit: (e) => e.blocks > 0 },
      { name: 'turns closing with a [HANDOFF] block at all', filter: (e) => e.event === 'stop', hit: (e) => e.blocks > 0 },
      { name: '  ... of which incomplete (violations)', filter: (e) => e.event === 'stop' && e.blocks > 0, hit: (e) => (e.violations || []).length > 0 },
      { name: 'turns that got the pre-close nudge (closing-shaped call)', filter: (e) => e.event === 'stop' && e.preclose !== undefined, hit: (e) => !!e.preclose },
      { name: 'stops blocked (strict mode)', filter: (e) => e.event === 'stop', hit: (e) => !!e.blocked },
    ],
  },
  'epistemic-self-monitoring': {
    env: 'EPIMON_LOG',
    rates: [
      { name: 'observe nudges emitted per shell command', filter: (e) => e.event === 'observe', hit: (e) => !!e.emitted },
      { name: 'final messages with an [EPISTEMIC CLOSE] block', filter: (e) => e.event === 'close', hit: (e) => e.blocks > 0 },
      { name: '  ... of which incomplete (violations)', filter: (e) => e.event === 'close' && e.blocks > 0, hit: (e) => (e.violations || []).length > 0 },
      { name: 'stops blocked (strict mode)', filter: (e) => e.event === 'close', hit: (e) => !!e.blocked },
    ],
  },
  'executive-self-monitoring': {
    env: 'EXECMON_LOG',
    rates: [
      { name: 'prompts that received the checkpoint (EVERY_N_TURNS)', filter: (e) => e.event === 'prompt', hit: (e) => !!e.emitted },
    ],
  },
  'progress-self-monitoring': {
    env: 'PROGRESSMON_LOG',
    turns: (e) => e.event === 'stop',
    // The age cut-off is the one reasoned number here: past it a ledger is
    // announced no more. Its distribution at session start is what tunes it.
    prompts: { filter: (e) => e.event === 'session_start' && e.exists && typeof e.ageMs === 'number', name: 'ledger age in days at session start (MAX_AGE_DAYS)', current: 14, value: (e) => Math.floor(e.ageMs / 86400000), candidates: [3, 7, 14, 30, 60] },
    rates: [
      { name: 'sessions opening on a ledger with open items (announced)', filter: (e) => e.event === 'session_start', hit: (e) => !!e.emitted },
      { name: 'sessions opening in a project with a ledger at all', filter: (e) => e.event === 'session_start', hit: (e) => !!e.exists },
      { name: 'turns that edited files next to a ledger with open items', filter: (e) => e.event === 'stop' && e.exists && e.open > 0, hit: (e) => e.edits > 0 },
      { name: '  ... of which left it stale (edits, ledger untouched)', filter: (e) => e.event === 'stop' && e.exists && e.open > 0 && e.edits > 0, hit: (e) => !!e.stale },
      { name: '  ... of which got the retrospective (once per ledger version)', filter: (e) => e.event === 'stop' && !!e.stale, hit: (e) => !!e.fired },
      { name: 'sessions ending with open items and a stale ledger (the unreachable last turn - the case for a strict gate)', filter: (e) => e.event === 'session_end', hit: (e) => e.exists && e.open > 0 && !!e.stale },
    ],
  },
};

function readLogs(dirs, plugin) {
  const events = [];
  for (const d of dirs) {
    for (const host of ['.claude', '.cursor']) {
      for (const suffix of ['', '.1']) {
        const f = path.join(d, host, 'logs', `${plugin}.jsonl${suffix}`);
        if (!fs.existsSync(f)) continue;
        for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
          if (!line.trim()) continue;
          try { events.push(JSON.parse(line)); } catch (_) { /* a torn line at rotation */ }
        }
      }
    }
  }
  return events;
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

const fmt = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%`.padStart(6) : '   n/a');

function distribution(label, values, current, candidates) {
  const v = values.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((a, b) => a - b);
  console.log(`\n  ${label}`);
  if (!v.length) { console.log('    no data'); return; }
  console.log(`    n=${v.length}  p50=${pct(v, 50)}  p90=${pct(v, 90)}  p95=${pct(v, 95)}  max=${v[v.length - 1]}`);
  const cells = candidates.map((c) => {
    const rate = v.filter((x) => x >= c).length;
    return `${c === current ? '*' : ' '}${String(c).padStart(2)}: ${fmt(rate, v.length)}`;
  });
  console.log(`    share of turns at or above threshold  (* = current)`);
  console.log('    ' + cells.join('   '));
}

function rate(label, events, filter, hit) {
  const pool = events.filter(filter);
  const n = pool.filter(hit).length;
  console.log(`  ${label.padEnd(58)} ${fmt(n, pool.length)}  (${n}/${pool.length})`);
}

/*
 * The collection as a whole: with several plugins installed, how much text
 * reaches the agent per prompt? Every plugin numbers its turns from the same
 * UserPromptSubmit, so prompt events join on session + turn (Claude Code
 * only; Cursor has no per-prompt event). Mid-turn nudges have no turn index
 * and are counted per session.
 */
function crossPlugin(dirs) {
  // per plugin: how many text blocks its prompt hook emitted on a given prompt
  const startOfTurn = {
    'executive-self-monitoring': (e) => (e.emitted ? 1 : 0),
    'epistemic-self-monitoring': (e) => (e.load ? 1 : 0) + (e.retrospective ? 1 : 0),
    'persistence-self-monitoring': (e) => (e.turn === 1 ? 1 : 0),
    'termination-self-monitoring': (e) => (e.load ? 1 : 0) + (e.retrospective ? 1 : 0),
    'coverage-self-monitoring': (e) => (e.turn === 1 ? 1 : 0) + (e.ledger ? 1 : 0) + (e.retrospective ? 1 : 0),
    'handoff-self-monitoring': (e) => (e.load ? 1 : 0) + (e.retrospective ? 1 : 0),
    'progress-self-monitoring': (e) => (e.turn === 1 ? 1 : 0) + (e.retrospective ? 1 : 0),
  };
  const midTurn = {
    'epistemic-self-monitoring': (e) => e.event === 'observe' && !!e.emitted,
    'persistence-self-monitoring': (e) => e.event === 'signal',
    'coverage-self-monitoring': (e) => e.event === 'signal',
    'handoff-self-monitoring': (e) => e.event === 'signal',
  };
  const prompts = new Map(); // "session\tturn" -> blocks
  const sessions = new Map(); // session -> { turns, nudges }
  let installed = 0;
  for (const plugin of Object.keys(PLUGINS)) {
    const events = readLogs(dirs, plugin).filter((e) => e.session);
    if (!events.length) continue;
    installed += 1;
    for (const e of events) {
      const s = sessions.get(e.session) || { turns: 0, nudges: 0 };
      if (e.event === 'prompt' && typeof (e.turn !== undefined ? e.turn : e.count) === 'number') {
        const turn = e.turn !== undefined ? e.turn : e.count;
        const key = `${e.session}\t${turn}`;
        prompts.set(key, (prompts.get(key) || 0) + (startOfTurn[plugin] ? startOfTurn[plugin](e) : 0));
        s.turns = Math.max(s.turns, turn);
      }
      if (midTurn[plugin] && midTurn[plugin](e)) s.nudges += 1;
      sessions.set(e.session, s);
    }
  }
  if (!prompts.size) return;
  const blocks = [...prompts.values()];
  const totalTurns = [...sessions.values()].reduce((a, s) => a + s.turns, 0);
  const totalNudges = [...sessions.values()].reduce((a, s) => a + s.nudges, 0);
  const hist = [0, 0, 0, 0];
  for (const b of blocks) hist[Math.min(b, 3)] += 1;
  console.log(`\n== all plugins together  (${installed} logging, ${sessions.size} sessions, ${blocks.length} prompts)`);
  console.log(`  text blocks injected at the start of a prompt: mean ${(blocks.reduce((a, b) => a + b, 0) / blocks.length).toFixed(2)}`);
  console.log(`    prompts with 0 / 1 / 2 / 3+ blocks: ${hist.map((n) => fmt(n, blocks.length).trim()).join(' / ')}`);
  console.log(`  mid-turn nudges per prompt (observe + counters): ${totalTurns ? (totalNudges / totalTurns).toFixed(2) : 'n/a'}  (${totalNudges}/${totalTurns})`);
  console.log('  A prompt that opens with three blocks, or a turn with more than one nudge, is where the signal turns into');
  console.log('  wallpaper. Lower the cadences (EVERY_N_TURNS, EVERY_N_COMMANDS) or drop a plugin before raising thresholds.');
}

function main() {
  const dirs = process.argv.slice(2).length ? process.argv.slice(2) : [process.cwd()];
  console.log(`agent-plugins threshold calibration - logs from: ${dirs.join(', ')}`);
  let any = false;

  for (const [plugin, spec] of Object.entries(PLUGINS)) {
    const events = readLogs(dirs, plugin);
    console.log(`\n== ${plugin}  (${events.length} events${events.length ? '' : ` - set ${spec.env}=1 to collect`})`);
    if (!events.length) continue;
    any = true;

    const sessions = new Set(events.map((e) => e.session || e.conversation).filter(Boolean)).size;
    const turns = spec.turns ? events.filter(spec.turns) : [];
    if (spec.turns) console.log(`  sessions=${sessions}  turns=${turns.length}`);

    for (const s of spec.signals || []) distribution(s.name, turns.map(s.value), s.current, s.candidates);
    if (spec.prompts) {
      const p = spec.prompts;
      distribution(p.name, events.filter(p.filter).map(p.value), p.current, p.candidates);
    }
    if (spec.rates) {
      console.log('');
      for (const r of spec.rates) rate(r.name, events, r.filter, r.hit);
    }
  }

  if (any) crossPlugin(dirs);

  if (!any) {
    console.log('\nNo logs found. Enable logging in the projects you work in (EXECMON_LOG, EPIMON_LOG, PERSISTMON_LOG,');
    console.log('TERMMON_LOG, COVMON_LOG, HANDMON_LOG, PROGRESSMON_LOG = 1), work normally for a while, then run this against those');
    console.log('project dirs.');
    process.exitCode = 1;
    return;
  }
  console.log('\nReading the tables: a threshold is a signal only if it is rare. Start from a band of roughly 5-15% of');
  console.log('turns; a column far above it is wallpaper, far below it is missing the turns it exists for. The logs');
  console.log('say how often each nudge fires, not whether it was right - for that, read the turns around a nudge in');
  console.log('the transcript (did the agent change approach? did the user have to intervene where no nudge fired?).');
}

main();
