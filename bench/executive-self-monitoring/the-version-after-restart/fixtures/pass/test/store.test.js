'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Store, etagOf } = require('..');

const dir = fs.mkdtempSync(path.join(__dirname, 'tmp-'));
try {
  const s = new Store(dir);
  const v1 = s.put('notes.txt', 'hello');
  assert.strictEqual(v1.etag, etagOf('hello'));
  const v2 = s.put('notes.txt', 'hello again');
  assert.strictEqual(s.get('notes.txt').body, 'hello again');
  assert.strictEqual(s.get('notes.txt', { versionId: v1.versionId }).body, 'hello');
  assert.deepStrictEqual(s.listVersions('notes.txt').map((v) => v.versionId), [v2.versionId, v1.versionId]);
  s.delete('notes.txt');
  assert.throws(() => s.get('notes.txt'), { code: 'NoSuchKey' });

  s.put('keep.txt', 'kept');
  const again = new Store(dir);
  assert.strictEqual(again.get('keep.txt').body, 'kept');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
