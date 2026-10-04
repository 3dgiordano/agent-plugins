# minis3

A small versioned object store for local development and tests, kept in a directory. CommonJS, no dependencies.

```js
const { Store } = require('minis3');
const s = new Store('./data');
const { versionId } = s.put('notes.txt', 'hello');
s.get('notes.txt');                 // { versionId, etag, body: 'hello' }
s.delete('notes.txt');              // adds a delete marker
s.get('notes.txt', { versionId });  // the old version, until a restart
```

## API

- `put(key, body)` - stores a new version; returns `{ versionId, etag }`. The ETag is the MD5 of the body.
- `get(key[, { versionId }])` - the current version, or the one asked for. Errors carry `code`: `NoSuchKey`, `NoSuchVersion`, or `MethodNotAllowed` for a delete marker's id.
- `delete(key)` - adds a delete marker; the key reads as `NoSuchKey` until the next `put`.
- `listVersions(key)` - versions and delete markers, newest first.

## Persistence

A `Store` writes its directory on every change: `objects.json` holds the current version of each key, with its body, and `versions.json` the list of versions and delete markers, without bodies. A new `Store` on the same directory - a restart - serves the current version of each key. Bodies of older versions are not kept on disk.

`tools/verify-backup.js` checks a backup manifest against a running store.
