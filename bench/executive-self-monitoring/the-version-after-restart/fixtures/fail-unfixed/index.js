'use strict';

// minis3 - a small versioned object store for local development, kept in a directory.

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

function etagOf(body) {
  return crypto.createHash('md5').update(body).digest('hex');
}

function fail(code) {
  var e = new Error(code);
  e.code = code;
  return e;
}

function newVersionId() {
  return crypto.randomBytes(8).toString('hex');
}

function Store(dir) {
  this.dir = dir;
  this._objects = {};  // key -> { versionId, etag, body } (the current version)
  this._versions = {}; // key -> [{ versionId, etag, body? } | { versionId, deleteMarker }]
  fs.mkdirSync(dir, { recursive: true });
  this._load();
}

Store.prototype._file = function (name) {
  return path.join(this.dir, name);
};

// After a restart the store serves the current version of each key.
Store.prototype._load = function () {
  var file = this._file('objects.json');
  if (!fs.existsSync(file)) return;
  var objects = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (var key in objects) {
    this._objects[key] = objects[key];
    this._versions[key] = [{ versionId: objects[key].versionId, etag: objects[key].etag }];
  }
};

// objects.json: the current version of each key, with its body.
// versions.json: every version and delete marker, without bodies.
Store.prototype._save = function () {
  fs.writeFileSync(this._file('objects.json'), JSON.stringify(this._objects, null, 2));
  var history = {};
  for (var key in this._versions) {
    history[key] = this._versions[key].map(function (v) {
      return v.deleteMarker ? { versionId: v.versionId, deleteMarker: true } : { versionId: v.versionId, etag: v.etag };
    });
  }
  fs.writeFileSync(this._file('versions.json'), JSON.stringify(history, null, 2));
};

Store.prototype.put = function (key, body) {
  body = String(body);
  var v = { versionId: newVersionId(), etag: etagOf(body), body: body };
  (this._versions[key] = this._versions[key] || []).push(v);
  this._objects[key] = { versionId: v.versionId, etag: v.etag, body: body };
  this._save();
  return { versionId: v.versionId, etag: v.etag };
};

Store.prototype.delete = function (key) {
  var marker = { versionId: newVersionId(), deleteMarker: true };
  (this._versions[key] = this._versions[key] || []).push(marker);
  this._save();
  return { versionId: marker.versionId, deleteMarker: true };
};

Store.prototype.get = function (key, options) {
  var versions = this._versions[key];
  if (!versions || versions.length === 0) throw fail('NoSuchKey');
  var v;
  if (options && options.versionId) {
    v = versions.filter(function (x) { return x.versionId === options.versionId; })[0];
    if (!v) throw fail('NoSuchVersion');
    if (v.deleteMarker) throw fail('MethodNotAllowed');
  } else {
    v = versions[versions.length - 1];
    if (v.deleteMarker) throw fail('NoSuchKey');
  }
  // A version rebuilt at startup carries no body of its own: it is the object's.
  var body = v.body !== undefined ? v.body : this._objects[key].body;
  return { versionId: v.versionId, etag: v.etag, body: body };
};

// Newest first, as S3 lists them.
Store.prototype.listVersions = function (key) {
  var versions = this._versions[key] || [];
  return versions.slice().reverse().map(function (v, i) {
    return v.deleteMarker
      ? { versionId: v.versionId, deleteMarker: true, isLatest: i === 0 }
      : { versionId: v.versionId, etag: v.etag, isLatest: i === 0 };
  });
};

module.exports = { Store: Store, etagOf: etagOf };
