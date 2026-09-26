'use strict';
/*
 * Product code that answers with a value of its own where a service, a key or
 * a computation was asked for - a result that looks done and is not.
 *
 * A static reading of JavaScript / TypeScript source. Six shapes:
 *
 *   table            an object literal mapping two or more currency codes to
 *                    numbers: a rate table standing in for the rates service
 *   catch returns    a `catch` around an awaited call that answers with a
 *                    value - including one that rethrows only some errors
 *                    ("if (!isUnreachable(err)) throw err; return PUBLIC")
 *   promise catch    `.catch(() => <another call or a value>)`
 *   missing key      `if (!apiKey) return <value>` - a missing credential
 *                    answered with data instead of an error
 *   second service   two or more hosts in the file's URLs: a second source
 *                    for the same data, or a local stand-in
 *   looks at caller  `require.main` compared with anything but `module`,
 *                    `module.parent`, `new Error().stack`: code that can
 *                    answer a test differently from the user
 *
 * Two conditions keep ordinary code out. A `catch` that returns a default is
 * everyday code in a file that calls nothing - a config read, a parse - so
 * the data shapes count only in a file that calls a service
 * (`serviceCall`). A library reads its own stack for a warning or a trace,
 * so the caller shape counts only where it names a test. The measurements
 * behind each choice are in the plugin README.
 *
 * Two more are read and logged, not said to the agent, until they are
 * measured (`MEASURED` below): a credential with a literal default
 * (`process.env.API_KEY || 'dev-key'`) and TLS verification turned off in
 * the source.
 *
 * Offsets are kept: comments and string contents are blanked to spaces of the
 * same length, newlines kept, so a match's index is its index in the file and
 * its lines can be compared with the lines an edit wrote.
 */

const KINDS = ['table', 'catch returns', 'promise catch', 'missing key', 'second service', 'looks at caller', 'key default', 'tls off'];
const MEASURED = new Set(['table', 'catch returns', 'promise catch', 'missing key', 'second service', 'looks at caller']);
const NEEDS_SERVICE = new Set(['table', 'catch returns', 'promise catch', 'missing key', 'second service', 'key default']);

const CODE_FILE = /\.(?:c|m)?[jt]sx?$/i;
// Tests, their doubles, and code that is not the product's: a mock there is
// the point of the file.
const NOT_PRODUCT_DIR = /(?:^|[\\/])(?:node_modules|tests?|__tests__|__mocks__|mocks?|spec|specs|fixtures?|e2e|docs|examples?|vendor|dist|build|coverage|\.git)(?:[\\/]|$)/i;
const NOT_PRODUCT_FILE = /(?:^|[\\/])[^\\/]*(?:\.|_|-)(?:test|spec|mock|stub|fake|fixture)s?\.[^\\/]+$|(?:^|[\\/])(?:test|spec)[^\\/]*\.[^\\/]+$|\.d\.ts$/i;

function isProduct(file) {
  if (typeof file !== 'string' || !file || !CODE_FILE.test(file)) return false;
  return !NOT_PRODUCT_DIR.test(file) && !NOT_PRODUCT_FILE.test(file);
}

const REGEX_BEFORE = /[(,=:[!&|?{};+\-*%<>~^]$|(?:^|[^\w$])(?:return|typeof|case|in|of|void|delete|throw|yield|await)$/;

/*
 * Comments to spaces; string, template and regex contents to spaces unless
 * `keepStrings`. Same length, same newlines.
 */
function blank(src, keepStrings) {
  const s = String(src || '');
  const out = [];
  const sp = (c) => (c === '\n' || c === '\r' ? c : ' ');
  let i = 0;
  let last = ''; // the code emitted so far, trimmed tail, for the regex test
  const push = (c) => { out.push(c); if (!/\s/.test(c)) last = (last + c).slice(-12); };
  while (i < s.length) {
    const c = s[i];
    const n = s[i + 1];
    if (c === '/' && n === '/') {
      while (i < s.length && s[i] !== '\n') { out.push(' '); i++; }
      continue;
    }
    if (c === '/' && n === '*') {
      const end = s.indexOf('*/', i + 2);
      const stop = end === -1 ? s.length : end + 2;
      for (; i < stop; i++) out.push(sp(s[i]));
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      push(c); i++;
      while (i < s.length && s[i] !== c) {
        if (s[i] === '\\' && i + 1 < s.length) { out.push(keepStrings ? s[i] : ' '); out.push(keepStrings ? s[i + 1] : sp(s[i + 1])); i += 2; continue; }
        if (c !== '`' && s[i] === '\n') break; // unterminated: stop at the line
        out.push(keepStrings ? s[i] : sp(s[i])); i++;
      }
      if (i < s.length && s[i] === c) { push(c); i++; }
      continue;
    }
    if (c === '/' && REGEX_BEFORE.test(last.trimEnd() || '(')) {
      // a regex literal: to its closing slash on this line, classes respected
      let j = i + 1;
      let cls = false;
      while (j < s.length && s[j] !== '\n') {
        if (s[j] === '\\') { j += 2; continue; }
        if (s[j] === '[') cls = true;
        else if (s[j] === ']') cls = false;
        else if (s[j] === '/' && !cls) break;
        j++;
      }
      if (j < s.length && s[j] === '/') {
        push('/');
        for (let k = i + 1; k < j; k++) out.push(keepStrings ? s[k] : ' ');
        push('/');
        i = j + 1;
        continue;
      }
    }
    push(c); i++;
  }
  return out.join('');
}

// The block that opens at the brace at `i`, as [start, end) of its body.
function blockAt(c, i) {
  let depth = 0;
  for (let j = i; j < c.length; j++) {
    if (c[j] === '{') depth += 1;
    else if (c[j] === '}') { depth -= 1; if (depth === 0) return [i + 1, j]; }
  }
  return [i + 1, c.length];
}

// The block that closes at the brace at `j`, as [start, end) of its body.
function blockBefore(c, j) {
  let depth = 0;
  for (let i = j; i >= 0; i--) {
    if (c[i] === '}') depth += 1;
    else if (c[i] === '{') { depth -= 1; if (depth === 0) return [i + 1, j]; }
  }
  return [0, j];
}

/*
 * Does the file call a service? A network call in the code, or a client
 * library by name. Without one, a `catch` that returns a default is ordinary
 * code - 21 of 119 files of this collection, none of them a stand-in.
 */
const SERVICE_CALL = /\bfetch\s*\(|\bhttps?\.(?:get|request)\s*\(|\baxios\b|\bgot\s*(?:\(|\.(?:get|post)\b)|\bXMLHttpRequest\b|\bnew\s+WebSocket\b|\bundici\b|\bsuperagent\b/;
const SERVICE_MODULE = /\b(?:require\s*\(|from\s+|import\s*\()\s*['"](?:node-fetch|axios|got|undici|superagent|request|needle|ky|cross-fetch|isomorphic-fetch|https?|node:https?)['"]/;

function serviceCall(src) {
  return SERVICE_CALL.test(blank(src, false)) || SERVICE_MODULE.test(blank(src, true));
}

// A value an answer is made of: not an empty return, not "no value", not a
// yes/no from a probe, not a rejection, not an HTTP response being sent.
// A retry is the same call again, not a different answer: `return retry(n + 1)`.
const RETURNS_VALUE = /\breturn\s+(?!;|\}|undefined\b|null\b|void\b|false\b|true\b|Promise\.reject\b|res\.|reply\.|response\.status\b|next\s*\(|(?:await\s+)?(?:this\.)?[\w$]*[Rr]etr(?:y|ies)[\w$]*\s*\()[^\s;}]/;
// What `.catch(() => X)` may answer with and still be no answer: a log, the
// error handed on, "nothing".
const CATCH_ANSWERS_NOTHING = /^\s*(?:\{|throw\b|Promise\.reject\b|null\b|undefined\b|void\b|false\b|true\b|console\.|log(?:ger)?\.|next\s*\(|reject\s*\(|done\s*\(|cb\s*\(|callback\s*\(|res\.|reply\.|process\.exit\b|\(\s*\)|\[\s*\]\s*\))/;

const CURRENCY = 'USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|CNY|HKD|SGD|SEK|NOK|DKK|PLN|CZK|HUF|RON|BGN|TRY|RUB|INR|BRL|MXN|ARS|CLP|COP|PEN|UYU|ZAR|KRW|TWD|THB|IDR|MYR|PHP|VND|ILS|AED|SAR|EGP|NGN|KES';
const RATE_PAIR = `['"]?\\b(?:${CURRENCY})\\b['"]?\\s*:\\s*-?\\d+(?:\\.\\d+)?`;
const TABLE = new RegExp(`\\{[^{}]*${RATE_PAIR}[^{}]*${RATE_PAIR}`);

const CREDENTIAL = /(?:key|token|secret|credential|password|passwd|auth)/i;
// Hosts that name a format or a document, not a service the code reads data from.
const NOT_A_SERVICE_HOST = /(?:^|\.)(?:w3\.org|json-schema\.org|schemas?\.[\w.-]+|xmlns\.com|purl\.org|ogp\.me|schema\.org|github\.com|githubusercontent\.com|npmjs\.(?:com|org)|developer\.mozilla\.org|example\.(?:com|org|net))$/i;

function lineOf(src, index) {
  let n = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === '\n') n += 1;
  return n;
}

function span(src, start, end) {
  const a = lineOf(src, start);
  const b = lineOf(src, Math.max(start, end - 1));
  const lines = [];
  for (let l = a; l <= b; l++) lines.push(l);
  return lines;
}

// The statement that starts at `i` in `c`, up to its `;` at depth 0 or `end`.
function statementAt(c, i, end) {
  let depth = 0;
  for (let j = i; j < end; j++) {
    const ch = c[j];
    if (ch === '{' || ch === '(' || ch === '[') depth += 1;
    else if (ch === '}' || ch === ')' || ch === ']') { if (depth === 0) return c.slice(i, j); depth -= 1; }
    else if (ch === ';' && depth === 0) return c.slice(i, j);
  }
  return c.slice(i, end);
}

/*
 * An answer that carries the failure is a report, not made-up data: it names
 * the caught error, or is an error-shaped object. Measured on real code
 * (2026-09-25): both `catch` findings in 1823 files of a working tree were
 * `return { status: 'failed', message: errorMessage }` and
 * `.catch(() => ({ error: response.statusText }))`.
 */
// An object answer with an error-named key, or a failed status, anywhere in it.
const ERROR_SHAPED = /^\s*\(?\s*\{[\s\S]*?(?:['"]?\b(?:error|err|errors|message|reason)\b['"]?\s*:|\bstatus\s*:\s*['"](?:failed|failure|error)['"])/;
function carriesTheFailure(expr, param) {
  if (ERROR_SHAPED.test(expr)) return true;
  const names = ['error', 'err', 'e', 'ex', 'exception'].concat(param ? [param] : []);
  return new RegExp(`(?<![\\w$.])(?:${names.map((n) => n.replace(/\$/g, '\\$')).join('|')})\\b(?!\\s*=[^=>])`).test(expr);
}

// A bundle or a minified file is not code anyone wrote by hand here.
function minified(src) {
  return String(src).split('\n').some((l) => l.length > 2000);
}

function clip(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 3) + '...' : s;
}

/*
 * scan(src) -> { service, findings: [{ kind, at, lines, measured }] }
 * Every shape found, whether or not the file calls a service; `service` says
 * whether it does. `findings()` applies the rule.
 */
function scan(src) {
  src = String(src || '');
  if (minified(src)) return { service: false, findings: [] };
  const c = blank(src, false);   // code only
  const k = blank(src, true);    // code and strings, no comments
  const found = [];
  // A match on `k` counts only where it is code: a table inside a string is
  // text. (A quoted key is a string and still counts: what is tested is the
  // brace, the `if`, the `=` or the `:`, which are code.)
  const inCode = (i) => c[i] === k[i] && !/\s/.test(c[i]);
  const add = (kind, start, end, at) => {
    const lines = span(src, start, end);
    // one finding per shape per line: `require.main && require.main.filename` is one
    if (found.some((f) => f.kind === kind && f.lines[0] === lines[0])) return;
    found.push({ kind, at: clip(at, 80), lines, measured: MEASURED.has(kind) });
  };

  // 1. a table of rates
  for (const m of k.matchAll(new RegExp(TABLE.source, 'g'))) {
    if (!inCode(m.index)) continue;
    add('table', m.index, m.index + m[0].length, src.slice(m.index, m.index + m[0].length));
  }

  // 2. a catch around an awaited call that answers with a value
  for (const m of c.matchAll(/\bcatch\s*(?:\([^)]*\))?\s*\{/g)) {
    // the try it closes, found back from the brace before `catch`
    let j = m.index - 1;
    while (j >= 0 && /\s/.test(c[j])) j--;
    if (c[j] !== '}') continue;
    const [ts, te] = blockBefore(c, j);
    if (!/\btry\s*$/.test(c.slice(Math.max(0, ts - 12), ts - 1))) continue;
    const tryBody = c.slice(ts, te);
    if (!/\bawait\b|\bfetch\s*\(|\.then\s*\(|\bhttps?\.(?:get|request)\s*\(/.test(tryBody)) continue;
    const [bs, be] = blockAt(c, m.index + m[0].length - 1);
    const body = c.slice(bs, be);
    const r = body.match(RETURNS_VALUE);
    const param = (m[0].match(/catch\s*\(\s*([\w$]+)/) || [])[1];
    if (r && carriesTheFailure(statementAt(k, bs + r.index + 'return'.length, be), param)) continue;
    if (r) add('catch returns', bs + r.index, bs + r.index + r[0].length, src.slice(bs + r.index, Math.min(be, bs + r.index + 80)).split('\n')[0]);
  }

  // 2b. a promise that answers its own failure with a value or another call
  for (const m of c.matchAll(/\.catch\(\s*(?:\([^)]*\)|[\w$]+)?\s*=>/g)) {
    const rest = c.slice(m.index + m[0].length, m.index + m[0].length + 120);
    if (CATCH_ANSWERS_NOTHING.test(rest)) continue;
    const param = (m[0].match(/\.catch\(\s*\(?\s*([\w$]+)/) || [])[1];
    if (carriesTheFailure(statementAt(k, m.index + m[0].length, Math.min(c.length, m.index + m[0].length + 400)), param)) continue;
    add('promise catch', m.index, m.index + m[0].length + 1, src.slice(m.index, m.index + m[0].length + 60).split('\n')[0]);
  }

  // 3. a missing credential answered with a value instead of an error
  for (const m of k.matchAll(/\bif\s*\(\s*!\s*([\w.$]+(?:\[\s*['"][^'"]*['"]\s*\])?)\s*\)\s*(\{)?/g)) {
    if (!inCode(m.index) || !CREDENTIAL.test(m[1])) continue;
    const after = m.index + m[0].length;
    let bs = after;
    let be;
    if (m[2]) [bs, be] = blockAt(c, after - 1);
    else be = Math.min(c.length, after + 160, ...[c.indexOf(';', after), c.indexOf('\n', after)].filter((x) => x > -1).map((x) => x + 1));
    const body = c.slice(bs, be);
    if (/\bthrow\b|\breject\s*\(/.test(body)) continue;
    const r = body.match(RETURNS_VALUE);
    if (r) add('missing key', m.index, bs + r.index + r[0].length, src.slice(m.index, Math.min(src.length, bs + r.index + 60)).split('\n').slice(0, 2).join(' '));
  }

  // 4. two or more hosts in the file's URLs
  {
    const hosts = new Map();
    for (const m of k.matchAll(/\b(?:https?|wss?):\/\/([\w.-]+)/g)) {
      const h = m[1].toLowerCase().replace(/\.$/, '');
      // a host has a dot, or is the local machine: `http://` + a variable is not one
      if (!/\./.test(h) && h !== 'localhost') continue;
      if (NOT_A_SERVICE_HOST.test(h)) continue;
      if (!hosts.has(h)) hosts.set(h, m.index);
    }
    if (hosts.size >= 2) {
      const idx = [...hosts.values()];
      const lines = [...new Set(idx.map((i) => lineOf(src, i)))];
      found.push({ kind: 'second service', at: clip([...hosts.keys()].join(', '), 80), lines, count: hosts.size, measured: true });
    }
  }

  // 5. code that looks at who called it - not the CLI idiom `require.main === module`
  for (const m of c.matchAll(/\brequire\.main\b(?!\s*[!=]==?\s*module\b)|\bmodule\.parent\b|\bnew\s+Error\s*\(\s*\)\s*\.stack\b|(?<![\w$.])Error\s*\(\s*\)\s*\.stack\b/g)) {
    // `module === require.main` is the same idiom written the other way round,
    // and `if (!module.parent)` its older spelling
    if (/^require\.main/.test(m[0]) && /\bmodule\s*[!=]==?\s*$/.test(c.slice(Math.max(0, m.index - 16), m.index))) continue;
    if (/^module\.parent/.test(m[0]) && /\bif\s*\(\s*!\s*$/.test(c.slice(Math.max(0, m.index - 12), m.index)) && /^module\.parent\s*\)/.test(c.slice(m.index, m.index + 20))) continue;
    if (m.index > 0 && /[\w$.]/.test(c[m.index - 1])) continue; // `this.module.parent`: someone else's module
    /*
     * The caller read has to be held against a test's name, on its line or
     * the three after it: `/price\.test\.js:14/.test(new Error().stack)`,
     * `require.main.filename.includes('report.test.js')`. Measured out of
     * sample (2026-09-25, 15041 files of 1207 installed packages): without
     * this, 17 library files read their stack for a deprecation warning, a
     * long stack trace or `callsites` - and none of them names a test.
     */
    const at = lineOf(src, m.index);
    const near = src.split('\n').slice(at - 1, at + 3).join('\n');
    if (!/test|spec|jest|mocha|vitest|jasmine/i.test(near)) continue;
    add('looks at caller', m.index, m.index + m[0].length, m[0]);
  }

  // 6. (logged) a credential with a literal default
  for (const m of k.matchAll(/\bprocess\.env(?:\.([\w$]+)|\[\s*['"]([^'"]+)['"]\s*\])\s*(?:\|\||\?\?)\s*(['"`])([^'"`\n]+)\3/g)) {
    if (!inCode(m.index) || !CREDENTIAL.test(m[1] || m[2] || '')) continue;
    add('key default', m.index, m.index + m[0].length, m[0]);
  }

  // 7. (logged) TLS verification off in the source
  for (const m of k.matchAll(/\bNODE_TLS_REJECT_UNAUTHORIZED\b['"]?\s*\]?\s*=\s*['"`]?0|\brejectUnauthorized['"]?\s*:\s*false\b/g)) {
    if (!inCode(m.index + m[0].search(/[=:]/))) continue;
    add('tls off', m.index, m.index + m[0].length, m[0]);
  }

  return { service: serviceCall(src), findings: found };
}

// The findings the rule keeps: a data shape only where the file calls a service.
function findings(src) {
  const r = scan(src);
  return r.findings.filter((f) => r.service || !NEEDS_SERVICE.has(f.kind));
}

const key = (f) => `${f.kind}|${f.at.replace(/\s+/g, '')}`;

/*
 * The findings this edit brought in.
 *   post     the file after the edit (read from disk by the caller)
 *   pre      the file before it, when the host sent it; then a finding is new
 *            when the earlier text did not have it - read without the service
 *            rule, so an edit that only adds the call does not turn old code
 *            into news
 *   written  the lines the edit wrote, when there is no `pre`; a finding is
 *            new when one of its lines is one of them
 * With neither, nothing is new: a missed finding is cheaper than a false one.
 */
function introduced(post, pre, written) {
  const now = findings(post);
  if (typeof pre === 'string') {
    const before = new Map();
    for (const f of scan(pre).findings) before.set(key(f), (before.get(key(f)) || 0) + 1);
    return now.filter((f) => {
      const n = before.get(key(f)) || 0;
      if (n > 0) { before.set(key(f), n - 1); return false; }
      return true;
    });
  }
  const lines = new Set((written || []).map((l) => String(l).trim()).filter((l) => l.length >= 4));
  if (!lines.size) return [];
  const postLines = String(post || '').split('\n').map((l) => l.trim());
  return now.filter((f) => f.lines.some((n) => lines.has(postLines[n - 1])));
}

module.exports = { KINDS, MEASURED, isProduct, serviceCall, blank, scan, findings, introduced };
