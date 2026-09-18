#!/usr/bin/env node
/*
 * The message samples quoted in README.md, generated from the code that
 * actually emits them.
 *
 *   node scripts/samples.js          print the canonical fences
 *   node scripts/samples.js --check  exit 1 if README.md has drifted
 *   node scripts/samples.js --fix    rewrite the README fences in place
 *
 * Why this exists: the "What your agent sees" section quotes five hook
 * messages verbatim. They are the first thing a reader believes and the last
 * thing anyone remembers to update -- commit 40d7dac changed four of them in
 * lib/messages.js and the README kept the old text. Here the sample IS the
 * code's output, so the two cannot disagree without CI saying so.
 *
 * No dependencies. --check and the default mode write nothing.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const README = path.join(ROOT, 'README.md');
const lib = (p, m) => require(path.join(ROOT, 'plugins', `${p}-self-monitoring`, 'lib', m));

const WRAP = 78;

// Keyed by the plugin word in the "[<word> self-monitoring]" prefix, which is
// what identifies a fence in the README.
const SAMPLES = {
  persistence: () => lib('persistence', 'messages.js').nudge([
    { kind: 'edits', key: 'src/parser.js', count: 4 },
    { kind: 'cmds', key: 'npm test', count: 3 },
  ]),

  // The executive nudge is written inline in the hook, not in a lib. Drive the
  // hook the way the host does -- JSON on stdin, read stdout -- so this sample
  // is the byte-for-byte output of the real process rather than a copy of it.
  executive: () => {
    const { spawnSync } = require('child_process');
    const hook = path.join(ROOT, 'plugins/executive-self-monitoring/hooks/exec-monitor.js');
    const sid = `samples-${process.pid}-${Date.now()}`;
    const r = spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ session_id: sid, hook_event_name: 'UserPromptSubmit', prompt: 'x' }),
      encoding: 'utf8',
    });
    // The hook counts turns in the temp dir; drop the counter it just created.
    try { fs.unlinkSync(path.join(require('os').tmpdir(), '3dgiordano-agent-plugins', `execmon_claude_${sid}.txt`)); } catch (_) {}
    const out = (r.stdout || '').trim();
    if (!out) throw new Error('executive: the hook emitted nothing on its first turn');
    return out;
  },

  termination: () => lib('termination', 'messages.js').retrospective(
    lib('termination', 'lexicon.js').scan(
      "I'm running out of context, let's pick this up in a fresh session."
    ).violations),

  coverage: () => lib('coverage', 'messages.js').nudge([
    { kind: 'stubs', count: 3, files: ['src/stream.js', 'src/retry.js'] },
  ]),

  handoff: () => lib('handoff', 'messages.js').preclose({ what: 'gate', label: 'npm test' }),
};

// Wrap on spaces at WRAP columns, the way the rest of the README is wrapped.
function wrap(text) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > WRAP) { out.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) out.push(line);
  return out.join('\n');
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();

// Every ``` fence in the README whose body opens with "[<word> self-monitoring]".
function fences(md) {
  const found = {};
  const re = /```[^\n]*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md)) !== null) {
    const key = (m[1].match(/^\[([a-z]+) self-monitoring\]/) || [])[1];
    if (key) found[key] = { body: m[1].replace(/\n$/, ''), start: m.index, end: re.lastIndex };
  }
  return found;
}

function compare() {
  const md = fs.readFileSync(README, 'utf8');
  const have = fences(md);
  const drift = [];
  for (const key of Object.keys(SAMPLES)) {
    const want = SAMPLES[key]();
    if (!have[key]) { drift.push({ key, why: 'no fence in README.md', want }); continue; }
    if (norm(have[key].body) !== norm(want)) drift.push({ key, why: 'text differs', want, got: have[key].body });
  }
  return { md, have, drift };
}

function main() {
  const mode = process.argv[2] || '';

  if (mode === '--fix') {
    let { md, have, drift } = compare();
    // Replace from the last fence backwards so earlier offsets stay valid.
    const edits = drift.filter((d) => have[d.key]).sort((a, b) => have[b.key].start - have[a.key].start);
    for (const d of edits) {
      const f = have[d.key];
      md = md.slice(0, f.start) + '```\n' + wrap(d.want) + '\n```' + md.slice(f.end);
    }
    if (edits.length) fs.writeFileSync(README, md);
    const missing = drift.filter((d) => !have[d.key]);
    console.log(`${edits.length} fence(s) rewritten in README.md`);
    for (const d of missing) console.log(`  ! ${d.key}: ${d.why} - add it by hand`);
    return;
  }

  if (mode === '--check') {
    const { drift } = compare();
    if (!drift.length) { console.log(`README.md: all ${Object.keys(SAMPLES).length} message samples match the code.`); return; }
    console.error(`README.md has drifted from the code in ${drift.length} sample(s):\n`);
    for (const d of drift) {
      console.error(`  [${d.key} self-monitoring] - ${d.why}`);
      if (d.got !== undefined) console.error(`    README: ${norm(d.got)}`);
      console.error(`    code  : ${norm(d.want)}\n`);
    }
    console.error('Run `node scripts/samples.js --fix` to rewrite them.');
    process.exitCode = 1;
    return;
  }

  for (const key of Object.keys(SAMPLES)) console.log('```\n' + wrap(SAMPLES[key]()) + '\n```\n');
}

if (require.main === module) main();
module.exports = { SAMPLES, wrap, norm, fences };
