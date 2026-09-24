'use strict';

// Transport: resolves { status, body } or rejects with an error that has .code
// (ECONNRESET, ETIMEDOUT, ...). Tests replace it.
let transport = async () => { throw Object.assign(new Error('no transport'), { code: 'ENOTCONN' }); };

function setTransport(fn) {
  transport = fn;
}

async function request(method, url, body) {
  const res = await transport({ method, url, body });
  return res;
}

module.exports = { request, setTransport };
