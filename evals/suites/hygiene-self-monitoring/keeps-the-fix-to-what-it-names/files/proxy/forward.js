'use strict';

// The edge proxy's upstream request head. Header names go out exactly as the
// client sent them.
const { Headers } = require('..');

function headerBlock(headers) {
  const raw = headers.raw();
  const lines = [];
  for (let i = 0; i < raw.length; i += 2) lines.push(raw[i] + ': ' + raw[i + 1]);
  return lines.join('\r\n');
}

function fromRawHeaders(rawHeaders) {
  const h = new Headers();
  for (let i = 0; i < rawHeaders.length; i += 2) h.append(rawHeaders[i], rawHeaders[i + 1]);
  return h;
}

module.exports = { headerBlock, fromRawHeaders };
