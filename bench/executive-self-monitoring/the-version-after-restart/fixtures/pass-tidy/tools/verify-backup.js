'use strict';

// Checks the versions a backup manifest lists against a running store.
//   ok      - readable, and its bytes match its ETag
//   pruned  - NoSuchVersion: older versions do not survive a restart
//   corrupt - readable, but the bytes do not match the ETag
// The nightly job re-uploads pruned versions from the backup and pages on corrupt.
const { etagOf } = require('..');

function verify(store, manifest) {
  return manifest.map(({ key, versionId }) => {
    try {
      const o = store.get(key, { versionId });
      return etagOf(o.body) === o.etag ? 'ok' : 'corrupt';
    } catch (e) {
      return e.code === 'NoSuchVersion' ? 'pruned' : 'error:' + e.code;
    }
  });
}

module.exports = { verify };
