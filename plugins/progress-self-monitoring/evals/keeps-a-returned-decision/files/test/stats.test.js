'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { stats } = require('../src/stats.js');

test('counts headings and words per markdown file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-'));
  fs.writeFileSync(path.join(dir, 'a.md'), '# One\n\ntwo three\n\n## Four\n');
  const rows = stats(dir, {});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].headings, 2);
  assert.equal(rows[0].words, 5);
  fs.rmSync(dir, { recursive: true, force: true });
});
